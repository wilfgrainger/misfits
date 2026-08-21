import { Hono } from 'hono';
import { requireAdmin, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { validateCompetitionLeagueInput, validateSeasonInput } from '../domain/competition';
import { AppError, jsonError } from '../errors';
import {
  assignUserToLeague,
  createSeason,
  deleteEmptyDraftSeason,
  getCompetitionLeague,
  getSeason,
  listCompetitionMemberships,
  listSeasonLeagues,
  listSeasons,
  listUnassignedUsers,
  moveUserBetweenLeagues,
  updateSeason,
} from '../db/competition';
import { createSeasonLeague, deleteEmptySeasonLeague, updateSeasonLeague } from '../db/competition-leagues';

interface CompetitionRouteDependencies {
  now?: () => Date;
}

function failure(c: Parameters<typeof jsonError>[0], error: unknown, fallback: string): Response {
  if (error instanceof AppError) return jsonError(c, error);
  if (error instanceof Error && /unique|constraint/i.test(error.message)) {
    return jsonError(c, new AppError('VALIDATION_ERROR', 'That competition value is already in use', 409));
  }
  return jsonError(c, new AppError('VALIDATION_ERROR', fallback, 400));
}

export function createCompetitionRoutes(dependencies: CompetitionRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.use('/api/admin/*', requireUser, requireAdmin);

  routes.get('/api/admin/seasons', async (c) => {
    return c.json({ seasons: await listSeasons(c.env.DB) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/seasons', requireSameOrigin, async (c) => {
    const validation = validateSeasonInput(await c.req.json().catch(() => null));
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `Season details are invalid: ${validation.reason}`, 400));
    try {
      const season = await createSeason(c.env.DB, c.get('user').id, validation.value, now());
      return c.json({ season }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'Season could not be created');
    }
  });

  routes.patch('/api/admin/seasons/:seasonId', requireSameOrigin, async (c) => {
    const current = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!current) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    const validation = validateSeasonInput({
      name: body?.name ?? current.name,
      status: body?.status ?? current.status,
      isCurrent: body?.isCurrent ?? current.is_current === 1,
    });
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `Season details are invalid: ${validation.reason}`, 400));
    try {
      const season = await updateSeason(c.env.DB, c.get('user').id, current.id, validation.value, now());
      return c.json({ season }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'Season could not be updated');
    }
  });

  routes.delete('/api/admin/seasons/:seasonId', requireSameOrigin, async (c) => {
    try {
      await deleteEmptyDraftSeason(c.env.DB, c.get('user').id, c.req.param('seasonId'), now());
      return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'Season could not be deleted');
    }
  });

  routes.get('/api/admin/seasons/:seasonId/leagues', async (c) => {
    const season = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!season) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    return c.json({ leagues: await listSeasonLeagues(c.env.DB, season.id) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/seasons/:seasonId/leagues', requireSameOrigin, async (c) => {
    const validation = validateCompetitionLeagueInput(await c.req.json().catch(() => null));
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `League details are invalid: ${validation.reason}`, 400));
    try {
      const league = await createSeasonLeague(c.env.DB, c.get('user').id, c.req.param('seasonId'), validation.value, now());
      return c.json({ league }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'League could not be created');
    }
  });

  routes.patch('/api/admin/competition/leagues/:leagueId', requireSameOrigin, async (c) => {
    const current = await getCompetitionLeague(c.env.DB, c.req.param('leagueId'));
    if (!current) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    const validation = validateCompetitionLeagueInput({
      name: body?.name ?? current.name,
      slug: body?.slug ?? current.slug,
      maxPlayers: body?.maxPlayers ?? current.max_players,
      matchesPerPair: body?.matchesPerPair ?? current.matches_per_pair,
      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,
      targetLegs: body?.targetLegs ?? current.target_legs,
      visibility: body?.visibility ?? current.visibility,
      hierarchyPosition: body?.hierarchyPosition ?? current.hierarchy_position,
      promotionPlaces: body?.promotionPlaces ?? current.promotion_places,
      relegationPlaces: body?.relegationPlaces ?? current.relegation_places,
    });
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `League details are invalid: ${validation.reason}`, 400));
    try {
      const league = await updateSeasonLeague(c.env.DB, c.get('user').id, current.id, validation.value, now());
      return c.json({ league }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'League could not be updated');
    }
  });

  routes.delete('/api/admin/competition/leagues/:leagueId', requireSameOrigin, async (c) => {
    try {
      await deleteEmptySeasonLeague(c.env.DB, c.get('user').id, c.req.param('leagueId'), now());
      return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'League could not be deleted');
    }
  });

  routes.get('/api/admin/seasons/:seasonId/unassigned', async (c) => {
    const season = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!season) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    const users = await listUnassignedUsers(c.env.DB, season.id);
    return c.json({ users }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/admin/competition/leagues/:leagueId/members', async (c) => {
    const league = await getCompetitionLeague(c.env.DB, c.req.param('leagueId'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const members = await listCompetitionMemberships(c.env.DB, league.id);
    return c.json({ members }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/seasons/:seasonId/members/:userId/assign', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { leagueId?: unknown } | null;
    if (typeof body?.leagueId !== 'string' || !body.leagueId) return jsonError(c, new AppError('VALIDATION_ERROR', 'Target league is required', 400));
    try {
      await assignUserToLeague(c.env.DB, c.get('user').id, c.req.param('seasonId'), body.leagueId, c.req.param('userId'), now());
      return c.json({ membership: { seasonId: c.req.param('seasonId'), leagueId: body.leagueId, userId: c.req.param('userId'), active: true } }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'Player could not be assigned');
    }
  });

  routes.post('/api/admin/seasons/:seasonId/members/:userId/move', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { fromLeagueId?: unknown; toLeagueId?: unknown } | null;
    if (typeof body?.fromLeagueId !== 'string' || typeof body?.toLeagueId !== 'string' || !body.fromLeagueId || !body.toLeagueId) {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Source and target leagues are required', 400));
    }
    try {
      await moveUserBetweenLeagues(c.env.DB, c.get('user').id, c.req.param('seasonId'), body.fromLeagueId, body.toLeagueId, c.req.param('userId'), now());
      return c.json({ membership: { seasonId: c.req.param('seasonId'), leagueId: body.toLeagueId, userId: c.req.param('userId'), active: true } }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'Player could not be moved');
    }
  });

  return routes;
}
