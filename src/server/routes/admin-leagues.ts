import { Hono } from 'hono';
import { requireAdmin, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { validateLeagueInput } from '../domain/league';
import { AppError, jsonError } from '../errors';
import { createInvite, revokeInvite } from '../db/invites';
import { createLeague, getLeagueById, listLeagueMembers, listPublicLeagues, setMembershipActive, updateLeague } from '../db/leagues';

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
  };
}

export function createAdminLeagueRoutes(dependencies: AdminLeagueRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.get('/api/admin/leagues', requireUser, requireAdmin, async (c) => {
    const leagues = await listPublicLeagues(c.env.DB);
    return c.json({ leagues: leagues.map(adminLeague) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/leagues', requireSameOrigin, requireUser, requireAdmin, async (c) => {
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

  routes.patch('/api/admin/leagues/:id', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    const current = await getLeagueById(c.env.DB, c.req.param('id'));
    if (!current) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
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

  routes.post('/api/admin/leagues/:id/invites', requireSameOrigin, requireUser, requireAdmin, async (c) => {
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

  routes.post('/api/admin/invites/:id/revoke', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    try {
      await revokeInvite(c.env.DB, c.get('user').id, c.req.param('id'), now());
      return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Invite could not be revoked', 400));
    }
  });

  routes.get('/api/admin/leagues/:id/members', requireUser, requireAdmin, async (c) => {
    const members = await listLeagueMembers(c.env.DB, c.req.param('id'));
    return c.json({ members: members.map((member) => ({ userId: member.user_id, username: member.username, profileImageUrl: member.profile_image_url, active: member.active === 1, joinedAt: member.joined_at })) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.patch('/api/admin/leagues/:leagueId/members/:userId', requireSameOrigin, requireUser, requireAdmin, async (c) => {
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

  return routes;
}
