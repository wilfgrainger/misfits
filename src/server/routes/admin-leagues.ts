import { Hono, type Context } from 'hono';
import { requireAdmin, requireNamedUser, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { validateLeagueInput } from '../domain/league';
import { AppError, jsonError } from '../errors';
import { createInvite, getInviteById, listLeagueInvites, revokeInvite } from '../db/invites';
import { createLeague, getLeagueById, getManagedLeague, listLeagueMembers, listManagedLeagues, setMembershipActive, updateLeague, type LeagueRecord } from '../db/leagues';
import { createAdminResult, deleteAdminResult, getAdminResults, getResultById, serializeResult, updateAdminResult } from '../db/results';

interface AdminLeagueRouteDependencies {
  now?: () => Date;
}

function adminLeague(league: Awaited<ReturnType<typeof getLeagueById>>) {
  if (!league) return null;
  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    seasonName: league.season_name,
    status: league.status,
    pointsPerWin: league.points_per_win,
    targetLegs: league.target_legs,
    maxPlayers: league.max_players,
    matchesPerPair: league.matches_per_pair,
    createdBy: league.created_by,
    visibility: league.visibility,
  };
}

async function managedLeagueOrResponse(c: Context<AuthAppEnv>, leagueId: string): Promise<LeagueRecord | Response> {
  try {
    return await getManagedLeague(c.env.DB, c.get('user'), leagueId);
  } catch (error) {
    if (error instanceof AppError) return jsonError(c, error);
    return jsonError(c, new AppError('FORBIDDEN', 'League access could not be verified', 403));
  }
}

export function createAdminLeagueRoutes(dependencies: AdminLeagueRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.use('/api/admin/*', requireUser, requireAdmin);

  routes.get('/api/admin/leagues', async (c) => {
    const leagues = await listManagedLeagues(c.env.DB);
    return c.json({ leagues: leagues.map(adminLeague) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/leagues', requireSameOrigin, requireNamedUser, async (c) => {
    const validation = validateLeagueInput(await c.req.json().catch(() => null), 'create');
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `League details are invalid: ${validation.reason}`, 400));
    try {
      const league = await createLeague(c.env.DB, c.get('user').id, validation.value, now());
      return c.json({ league: adminLeague(league) }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) return jsonError(c, new AppError('VALIDATION_ERROR', 'That league slug is already in use', 409));
      return jsonError(c, new AppError('VALIDATION_ERROR', 'League could not be created', 400));
    }
  });

  routes.patch('/api/admin/leagues/:id', requireSameOrigin, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('id'));
    if (access instanceof Response) return access;
    const current = access;
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    const validation = validateLeagueInput({
      name: body?.name ?? current.name,
      slug: body?.slug ?? current.slug,
      seasonName: body?.seasonName ?? current.season_name,
      maxPlayers: body?.maxPlayers ?? current.max_players,
      matchesPerPair: body?.matchesPerPair ?? current.matches_per_pair,
      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,
      targetLegs: body?.targetLegs ?? current.target_legs,
      status: body?.status ?? current.status,
      visibility: body?.visibility ?? current.visibility,
    }, 'edit');
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `League details are invalid: ${validation.reason}`, 400));
    try {
      const league = await updateLeague(c.env.DB, c.get('user').id, current.id, validation.value, now());
      return c.json({ league: adminLeague(league) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      if (error instanceof Error && /unique|constraint/i.test(error.message)) return jsonError(c, new AppError('VALIDATION_ERROR', 'That league slug is already in use', 409));
      return jsonError(c, new AppError('VALIDATION_ERROR', 'League could not be updated', 400));
    }
  });

  routes.get('/api/admin/leagues/:id/invites', requireUser, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('id'));
    if (access instanceof Response) return access;
    const invites = await listLeagueInvites(c.env.DB, c.req.param('id'));
    return c.json({ invites: invites.map((invite) => ({
      id: invite.id,
      leagueId: invite.league_id,
      expiresAt: invite.expires_at,
      uses: invite.uses,
      revokedAt: invite.revoked_at,
      createdAt: invite.created_at,
    })) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/leagues/:id/invites', requireSameOrigin, requireUser, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('id'));
    if (access instanceof Response) return access;
    const body = await c.req.json().catch(() => null) as { expiresAt?: unknown } | null;
    const expiresAt = body?.expiresAt === undefined || body.expiresAt === null || body.expiresAt === '' ? null : typeof body.expiresAt === 'string' && !Number.isNaN(Date.parse(body.expiresAt)) ? new Date(body.expiresAt).toISOString() : null;
    if (body?.expiresAt !== undefined && body.expiresAt !== null && body.expiresAt !== '' && !expiresAt) return jsonError(c, new AppError('VALIDATION_ERROR', 'Invite expiry is invalid', 400));
    try {
      const result = await createInvite(c.env.DB, c.get('user').id, c.req.param('id'), now(), expiresAt);
      return c.json({ invite: { id: result.invite.id, leagueId: result.invite.league_id, expiresAt: result.invite.expires_at, url: `${c.env.APP_ORIGIN}/join/${result.token}` } }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Invite could not be created', 400));
    }
  });

  routes.post('/api/admin/invites/:id/revoke', requireSameOrigin, requireUser, async (c) => {
    const invite = await getInviteById(c.env.DB, c.req.param('id'));
    if (!invite) return jsonError(c, new AppError('INVITE_INVALID', 'Invite was not found', 404));
    const access = await managedLeagueOrResponse(c, invite.league_id);
    if (access instanceof Response) return access;
    try {
      await revokeInvite(c.env.DB, c.get('user').id, c.req.param('id'), now());
      return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Invite could not be revoked', 400));
    }
  });

  routes.get('/api/admin/leagues/:id/members', requireUser, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('id'));
    if (access instanceof Response) return access;
    const members = await listLeagueMembers(c.env.DB, c.req.param('id'));
    return c.json({ members: members.map((member) => ({ userId: member.user_id, username: member.username, profileImageUrl: member.profile_image_url, active: member.active === 1, joinedAt: member.joined_at })) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.patch('/api/admin/leagues/:leagueId/members/:userId', requireSameOrigin, requireUser, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('leagueId'));
    if (access instanceof Response) return access;
    const body = await c.req.json().catch(() => null) as { active?: unknown } | null;
    if (typeof body?.active !== 'boolean') return jsonError(c, new AppError('VALIDATION_ERROR', 'Member active state is required', 400));
    try {
      const member = await setMembershipActive(c.env.DB, c.get('user').id, c.req.param('leagueId'), c.req.param('userId'), body.active, now());
      return c.json({ member: { userId: member.user_id, active: member.active === 1 } }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Member could not be updated', 400));
    }
  });

  routes.get('/api/admin/leagues/:id/results', requireUser, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('id'));
    if (access instanceof Response) return access;
    const results = await getAdminResults(c.env.DB, c.req.param('id'));
    return c.json({ results: results.map(serializeResult) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/leagues/:id/results', requireSameOrigin, requireUser, async (c) => {
    const access = await managedLeagueOrResponse(c, c.req.param('id'));
    if (access instanceof Response) return access;
    try {
      const result = await createAdminResult(c.env.DB, c.get('user').id, c.req.param('id'), await c.req.json().catch(() => null), now());
      return c.json({ result: serializeResult(result) }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be entered', 400));
    }
  });

  routes.patch('/api/admin/results/:id', requireSameOrigin, requireUser, async (c) => {
    const existing = await getResultById(c.env.DB, c.req.param('id'));
    if (!existing) return jsonError(c, new AppError('VALIDATION_ERROR', 'Result was not found', 404));
    const access = await managedLeagueOrResponse(c, existing.league_id);
    if (access instanceof Response) return access;
    try {
      const result = await updateAdminResult(c.env.DB, c.get('user').id, c.req.param('id'), await c.req.json().catch(() => null), now());
      return c.json({ result: serializeResult(result) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be updated', 400));
    }
  });

  routes.delete('/api/admin/results/:id', requireSameOrigin, requireUser, async (c) => {
    const existing = await getResultById(c.env.DB, c.req.param('id'));
    if (!existing) return jsonError(c, new AppError('VALIDATION_ERROR', 'Result was not found', 404));
    const access = await managedLeagueOrResponse(c, existing.league_id);
    if (access instanceof Response) return access;
    try {
      await deleteAdminResult(c.env.DB, c.get('user').id, c.req.param('id'), now());
      return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be deleted', 400));
    }
  });

  return routes;
}
