import { Hono } from 'hono';
import { requireAdmin, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { validateCompetitionLeagueInput, validateSeasonInput, type FixtureStatus } from '../domain/competition';
import { AppError, jsonError } from '../errors';
import {
  assignUserToLeague,
  commitLeagueFixtures,
  createSeason,
  deleteEmptyDraftSeason,
  deleteUnplayedFixtures,
  getCompetitionLeague,
  getSeason,
  listCompetitionMemberships,
  listFixtures,
  listSeasonLeagues,
  listSeasons,
  listUnassignedUsers,
  moveUserBetweenLeagues,
  previewLeagueFixtures,
  seasonHealth,
  setFixtureStatus,
} from '../db/competition';
import { createSeasonLeague, deleteEmptySeasonLeague, updateSeasonLeague } from '../db/competition-leagues';
import { cloneSeasonStructure, updateSeasonLifecycle } from '../db/season-lifecycle';
import { applyPromotionProposal, createPromotionProposal, getPromotionPreview, overridePromotionMovement } from '../db/promotion';

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

function fixtureStatus(value: string | undefined): FixtureStatus | undefined {
  if (!value) return undefined;
  return ['OUTSTANDING', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED', 'VOID'].includes(value) ? value as FixtureStatus : undefined;
}

export function createCompetitionRoutes(dependencies: CompetitionRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.use('/api/admin/*', requireUser, requireAdmin);

  routes.get('/api/admin/seasons', async (c) => c.json({ seasons: await listSeasons(c.env.DB) }, 200, { 'Cache-Control': 'private, no-store' }));

  routes.post('/api/admin/seasons', requireSameOrigin, async (c) => {
    const validation = validateSeasonInput(await c.req.json().catch(() => null));
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `Season details are invalid: ${validation.reason}`, 400));
    if (validation.value.status !== 'DRAFT') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A new season must start in draft so its leagues and memberships can be prepared', 409));
    }
    try {
      const season = await createSeason(c.env.DB, c.get('user').id, validation.value, now());
      return c.json({ season }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) { return failure(c, error, 'Season could not be created'); }
  });

  routes.post('/api/admin/seasons/:seasonId/clone', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { name?: unknown } | null;
    const validation = validateSeasonInput({ name: body?.name, status: 'DRAFT', isCurrent: false });
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `Season details are invalid: ${validation.reason}`, 400));
    try {
      const cloned = await cloneSeasonStructure(c.env.DB, c.get('user').id, c.req.param('seasonId'), validation.value.name, now());
      return c.json(cloned, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) { return failure(c, error, 'Season structure could not be copied'); }
  });

  routes.patch('/api/admin/seasons/:seasonId', requireSameOrigin, async (c) => {
    const current = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!current) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    const validation = validateSeasonInput({ name: body?.name ?? current.name, status: body?.status ?? current.status, isCurrent: body?.isCurrent ?? current.is_current === 1 });
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `Season details are invalid: ${validation.reason}`, 400));
    try { return c.json({ season: await updateSeasonLifecycle(c.env.DB, c.get('user').id, current.id, validation.value, now()) }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Season could not be updated'); }
  });

  routes.delete('/api/admin/seasons/:seasonId', requireSameOrigin, async (c) => {
    try { await deleteEmptyDraftSeason(c.env.DB, c.get('user').id, c.req.param('seasonId'), now()); return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Season could not be deleted'); }
  });

  routes.get('/api/admin/seasons/:seasonId/leagues', async (c) => {
    const season = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!season) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    return c.json({ leagues: await listSeasonLeagues(c.env.DB, season.id) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/seasons/:seasonId/leagues', requireSameOrigin, async (c) => {
    const validation = validateCompetitionLeagueInput(await c.req.json().catch(() => null));
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `League details are invalid: ${validation.reason}`, 400));
    try { return c.json({ league: await createSeasonLeague(c.env.DB, c.get('user').id, c.req.param('seasonId'), validation.value, now()) }, 201, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'League could not be created'); }
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
      maxLegs: body?.maxLegs ?? (body?.targetLegs === undefined ? current.max_legs : undefined),
      pointsPerWin: body?.pointsPerWin ?? current.points_per_win,
      pointsPerDraw: body?.pointsPerDraw ?? current.points_per_draw,
      pointsPerLoss: body?.pointsPerLoss ?? current.points_per_loss,
      targetLegs: body?.targetLegs ?? current.target_legs,
      visibility: body?.visibility ?? current.visibility,
      hierarchyPosition: body?.hierarchyPosition ?? current.hierarchy_position,
      promotionPlaces: body?.promotionPlaces ?? current.promotion_places,
      relegationPlaces: body?.relegationPlaces ?? current.relegation_places,
    });
    if (!validation.ok) return jsonError(c, new AppError('VALIDATION_ERROR', `League details are invalid: ${validation.reason}`, 400));
    try { return c.json({ league: await updateSeasonLeague(c.env.DB, c.get('user').id, current.id, validation.value, now()) }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'League could not be updated'); }
  });

  routes.delete('/api/admin/competition/leagues/:leagueId', requireSameOrigin, async (c) => {
    try { await deleteEmptySeasonLeague(c.env.DB, c.get('user').id, c.req.param('leagueId'), now()); return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'League could not be deleted'); }
  });

  routes.get('/api/admin/seasons/:seasonId/unassigned', async (c) => {
    const season = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!season) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    return c.json({ users: await listUnassignedUsers(c.env.DB, season.id) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.get('/api/admin/seasons/:seasonId/health', async (c) => {
    const season = await getSeason(c.env.DB, c.req.param('seasonId'));
    if (!season) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'Season was not found', 404));
    try {
      return c.json({ health: await seasonHealth(c.env.DB, season.id) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      return failure(c, error, 'Season health could not be loaded');
    }
  });

  routes.get('/api/admin/competition/leagues/:leagueId/members', async (c) => {
    const league = await getCompetitionLeague(c.env.DB, c.req.param('leagueId'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    return c.json({ members: await listCompetitionMemberships(c.env.DB, league.id) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/seasons/:seasonId/members/:userId/assign', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { leagueId?: unknown } | null;
    if (typeof body?.leagueId !== 'string' || !body.leagueId) return jsonError(c, new AppError('VALIDATION_ERROR', 'Target league is required', 400));
    try { await assignUserToLeague(c.env.DB, c.get('user').id, c.req.param('seasonId'), body.leagueId, c.req.param('userId'), now()); return c.json({ membership: { seasonId: c.req.param('seasonId'), leagueId: body.leagueId, userId: c.req.param('userId'), active: true } }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Player could not be assigned'); }
  });

  routes.post('/api/admin/seasons/:seasonId/members/:userId/move', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { fromLeagueId?: unknown; toLeagueId?: unknown } | null;
    if (typeof body?.fromLeagueId !== 'string' || typeof body?.toLeagueId !== 'string' || !body.fromLeagueId || !body.toLeagueId) return jsonError(c, new AppError('VALIDATION_ERROR', 'Source and target leagues are required', 400));
    try { await moveUserBetweenLeagues(c.env.DB, c.get('user').id, c.req.param('seasonId'), body.fromLeagueId, body.toLeagueId, c.req.param('userId'), now()); return c.json({ membership: { seasonId: c.req.param('seasonId'), leagueId: body.toLeagueId, userId: c.req.param('userId'), active: true } }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Player could not be moved'); }
  });

  routes.get('/api/admin/seasons/:seasonId/promotion/preview', async (c) => {
    try { return c.json({ preview: await getPromotionPreview(c.env.DB, c.req.param('seasonId')) }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Promotion projection could not be generated'); }
  });

  routes.post('/api/admin/seasons/:seasonId/promotion/proposal', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { toSeasonId?: unknown } | null;
    if (typeof body?.toSeasonId !== 'string' || !body.toSeasonId) return jsonError(c, new AppError('VALIDATION_ERROR', 'Target season is required', 400));
    try {
      const movements = await createPromotionProposal(c.env.DB, c.get('user').id, c.req.param('seasonId'), body.toSeasonId, now());
      return c.json({ movements }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) { return failure(c, error, 'Promotion proposal could not be created'); }
  });

  routes.patch('/api/admin/seasons/:seasonId/promotion/:userId', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { toLeagueId?: unknown; reason?: unknown } | null;
    if (typeof body?.toLeagueId !== 'string' || !body.toLeagueId || typeof body.reason !== 'string') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Override target and reason are required', 400));
    }
    try {
      const movement = await overridePromotionMovement(c.env.DB, c.get('user').id, c.req.param('seasonId'), c.req.param('userId'), body.toLeagueId, body.reason, now());
      return c.json({ movement }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) { return failure(c, error, 'Promotion override could not be saved'); }
  });

  routes.post('/api/admin/seasons/:seasonId/promotion/apply', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { toSeasonId?: unknown } | null;
    if (typeof body?.toSeasonId !== 'string' || !body.toSeasonId) return jsonError(c, new AppError('VALIDATION_ERROR', 'Target season is required', 400));
    try {
      const result = await applyPromotionProposal(c.env.DB, c.get('user').id, c.req.param('seasonId'), body.toSeasonId, now());
      return c.json(result, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) { return failure(c, error, 'Promotion plan could not be applied'); }
  });

  routes.get('/api/admin/competition/leagues/:leagueId/fixtures/preview', async (c) => {
    try { return c.json({ preview: await previewLeagueFixtures(c.env.DB, c.req.param('leagueId')) }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Fixture preview could not be generated'); }
  });

  routes.get('/api/admin/competition/leagues/:leagueId/fixtures', async (c) => {
    const requested = c.req.query('status');
    const status = fixtureStatus(requested);
    if (requested && !status) return jsonError(c, new AppError('VALIDATION_ERROR', 'Fixture status is invalid', 400));
    try { return c.json({ fixtures: await listFixtures(c.env.DB, c.req.param('leagueId'), status) }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Fixtures could not be loaded'); }
  });

  routes.post('/api/admin/competition/leagues/:leagueId/fixtures', requireSameOrigin, async (c) => {
    try {
      const existing = await listFixtures(c.env.DB, c.req.param('leagueId'));
      const fixtures = await commitLeagueFixtures(c.env.DB, c.get('user').id, c.req.param('leagueId'), now());
      return c.json({ fixtures }, existing.length > 0 ? 200 : 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) { return failure(c, error, 'Fixtures could not be generated'); }
  });

  routes.delete('/api/admin/competition/leagues/:leagueId/fixtures', requireSameOrigin, async (c) => {
    try { await deleteUnplayedFixtures(c.env.DB, c.get('user').id, c.req.param('leagueId'), now()); return c.json({ ok: true }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Fixtures could not be reset'); }
  });

  routes.patch('/api/admin/competition/fixtures/:fixtureId', requireSameOrigin, async (c) => {
    const body = await c.req.json().catch(() => null) as { status?: unknown } | null;
    if (body?.status !== 'VOID' && body?.status !== 'OUTSTANDING') return jsonError(c, new AppError('VALIDATION_ERROR', 'Only void or restore is available through fixture administration', 400));
    try { return c.json({ fixture: await setFixtureStatus(c.env.DB, c.get('user').id, c.req.param('fixtureId'), body.status, now()) }, 200, { 'Cache-Control': 'private, no-store' }); }
    catch (error) { return failure(c, error, 'Fixture could not be updated'); }
  });

  return routes;
}
