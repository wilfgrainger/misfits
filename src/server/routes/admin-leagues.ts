import { Hono, type Context } from 'hono';
import { requireAdmin, requireNamedUser, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { validateLeagueInput } from '../domain/league';
import { AppError, jsonError } from '../errors';
import { createLeague, getLeagueById, getManagedLeague, listLeagueMembers, listManagedLeagues, setMembershipActive, updateLeague, type LeagueRecord } from '../db/leagues';
import { createAdminResult, deleteAdminResult, getAdminResults, getResultById, serializeResult, updateAdminResult } from '../db/results';
import {
  assertAdminUpdateMatchesFixture,
  createAdminFixtureResult,
  fixtureIdForResult,
  leagueHasPersistedFixtures,
  syncFixtureForResult,
  type FixtureResultRecord,
} from '../db/fixture-results';

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
    maxLegs: league.max_legs ?? ((league.target_legs * 2) - 1),
    pointsPerWin: league.points_per_win,
    pointsPerDraw: league.points_per_draw ?? 0,
    pointsPerLoss: league.points_per_loss ?? 0,
    targetLegs: league.target_legs,
    maxPlayers: league.max_players,
    matchesPerPair: league.matches_per_pair,
    createdBy: league.created_by,
    visibility: league.visibility,
  };
}

function serializeFixtureResult(result: FixtureResultRecord) {
  return {
    id: result.id,
    fixtureId: result.fixture_id,
    leagueId: result.league_id,
    playerAId: result.player_a_id,
    playerBId: result.player_b_id,
    playerAUsername: result.player_a_username ?? null,
    playerBUsername: result.player_b_username ?? null,
    playerALegs: result.player_a_legs,
    playerBLegs: result.player_b_legs,
    playerAAverage: Number(result.player_a_average),
    playerBAverage: Number(result.player_b_average),
    submittedBy: result.submitted_by,
    status: result.status,
    confirmedBy: result.confirmed_by,
    disputeNote: result.dispute_note,
    createdAt: result.created_at,
    confirmedAt: result.confirmed_at,
  };
}

async function serializeAdminResult(db: D1Database, result: Parameters<typeof serializeResult>[0]) {
  return { ...serializeResult(result), fixtureId: await fixtureIdForResult(db, result.id) };
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
      maxLegs: body?.maxLegs ?? (body?.targetLegs === undefined ? current.max_legs : undefined),
      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,
      pointsPerDraw: body?.pointsPerDraw ?? current.points_per_draw,
      pointsPerLoss: body?.pointsPerLoss ?? current.points_per_loss,
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
    return c.json({ results: await Promise.all(results.map((result) => serializeAdminResult(c.env.DB, result))) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/leagues/:id/results', requireSameOrigin, requireUser, async (c) => {
    const leagueId = c.req.param('id');
    const access = await managedLeagueOrResponse(c, leagueId);
    if (access instanceof Response) return access;
    const body = await c.req.json().catch(() => null);
    try {
      if (body && typeof body === 'object' && typeof (body as { fixtureId?: unknown }).fixtureId === 'string') {
        const result = await createAdminFixtureResult(c.env.DB, c.get('user').id, leagueId, body, now());
        return c.json({ result: serializeFixtureResult(result) }, 201, { 'Cache-Control': 'private, no-store' });
      }
      if (await leagueHasPersistedFixtures(c.env.DB, leagueId)) {
        throw new AppError('RESULT_ALREADY_RESOLVED', 'Choose an outstanding fixture before entering a league result', 409);
      }
      const result = await createAdminResult(c.env.DB, c.get('user').id, leagueId, body, now());
      return c.json({ result: serializeResult(result) }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be entered', 400));
    }
  });

  routes.patch('/api/admin/results/:id', requireSameOrigin, requireUser, async (c) => {
    const resultId = c.req.param('id');
    const existing = await getResultById(c.env.DB, resultId);
    if (!existing) return jsonError(c, new AppError('VALIDATION_ERROR', 'Result was not found', 404));
    const access = await managedLeagueOrResponse(c, existing.league_id);
    if (access instanceof Response) return access;
    const body = await c.req.json().catch(() => null);
    try {
      await assertAdminUpdateMatchesFixture(c.env.DB, resultId, body);
      const result = await updateAdminResult(c.env.DB, c.get('user').id, resultId, body, now());
      await syncFixtureForResult(c.env.DB, resultId, now());
      return c.json({ result: await serializeAdminResult(c.env.DB, result) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be updated', 400));
    }
  });

  routes.delete('/api/admin/results/:id', requireSameOrigin, requireUser, async (c) => {
    const resultId = c.req.param('id');
    const existing = await getResultById(c.env.DB, resultId);
    if (!existing) return jsonError(c, new AppError('VALIDATION_ERROR', 'Result was not found', 404));
    const access = await managedLeagueOrResponse(c, existing.league_id);
    if (access instanceof Response) return access;
    try {
      await deleteAdminResult(c.env.DB, c.get('user').id, resultId, now());
      await syncFixtureForResult(c.env.DB, resultId, now());
      return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be deleted', 400));
    }
  });

  return routes;
}
