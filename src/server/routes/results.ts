import { Hono, type Context } from 'hono';
import { requireNamedUser, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { resolveRequestSession } from '../auth/session';
import { AppError, jsonError } from '../errors';
import { getLeagueByIdOrSlug, canViewLeague } from '../db/leagues';
import { getPlayerResults, getPublicResults, getLeagueStandings, serializeResult, submitPlayerResult, confirmResult, disputeResult } from '../db/results';
import {
  fixtureIdForResult,
  leagueHasPersistedFixtures,
  submitFixtureResult,
  syncFixtureForResult,
  type FixtureResultRecord,
} from '../db/fixture-results';

interface ResultRouteDependencies {
  now?: () => Date;
}

async function findViewableLeague(c: Context<AuthAppEnv>, leagueId: string) {
  const league = await getLeagueByIdOrSlug(c.env.DB, leagueId);
  if (!league) return null;
  const user = await resolveRequestSession(c.env.DB, c.req.raw);
  return await canViewLeague(c.env.DB, league, user ?? undefined) ? league : null;
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

async function serializeResolvedResult(db: D1Database, result: Parameters<typeof serializeResult>[0]) {
  const fixtureId = await fixtureIdForResult(db, result.id);
  return { ...serializeResult(result), fixtureId };
}

export function createResultRoutes(dependencies: ResultRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.get('/api/public/leagues/:leagueId/standings', async (c) => {
    const league = await findViewableLeague(c, c.req.param('leagueId'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    try {
      return c.json({ standings: await getLeagueStandings(c.env.DB, league.id) }, 200, { 'Cache-Control': league.visibility === 'PUBLIC' ? 'public, max-age=15' : 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Standings could not be loaded', 400));
    }
  });

  routes.get('/api/public/leagues/:leagueId/results', async (c) => {
    const league = await findViewableLeague(c, c.req.param('leagueId'));
    if (!league) return jsonError(c, new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404));
    const results = await getPublicResults(c.env.DB, league.id);
    return c.json({ results: results.map(serializeResult) }, 200, { 'Cache-Control': league.visibility === 'PUBLIC' ? 'public, max-age=15' : 'private, no-store' });
  });

  routes.get('/api/me/results', requireUser, async (c) => {
    const results = await getPlayerResults(c.env.DB, c.get('user').id);
    return c.json({ results: results.map(serializeResult) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/leagues/:leagueId/results', requireSameOrigin, requireUser, requireNamedUser, async (c) => {
    const leagueId = c.req.param('leagueId');
    const body = await c.req.json().catch(() => null);
    try {
      if (body && typeof body === 'object' && typeof (body as { fixtureId?: unknown }).fixtureId === 'string') {
        const result = await submitFixtureResult(c.env.DB, c.get('user').id, leagueId, body, now());
        return c.json({ result: serializeFixtureResult(result) }, 201, { 'Cache-Control': 'private, no-store' });
      }
      if (await leagueHasPersistedFixtures(c.env.DB, leagueId)) {
        throw new AppError('RESULT_ALREADY_RESOLVED', 'Choose an outstanding fixture before recording a league result', 409);
      }
      const result = await submitPlayerResult(c.env.DB, c.get('user').id, leagueId, body, now());
      return c.json({ result: serializeResult(result) }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be recorded', 400));
    }
  });

  routes.post('/api/results/:resultId/confirm', requireSameOrigin, requireUser, async (c) => {
    const resultId = c.req.param('resultId');
    try {
      const result = await confirmResult(c.env.DB, c.get('user').id, resultId, now());
      await syncFixtureForResult(c.env.DB, resultId, now());
      return c.json({ result: await serializeResolvedResult(c.env.DB, result) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Result could not be confirmed', 400));
    }
  });

  routes.post('/api/results/:resultId/dispute', requireSameOrigin, requireUser, async (c) => {
    const resultId = c.req.param('resultId');
    const body = await c.req.json().catch(() => null) as { note?: unknown } | null;
    if (typeof body?.note !== 'string') return jsonError(c, new AppError('INVALID_RESULT', 'A dispute note is required', 400));
    try {
      const result = await disputeResult(c.env.DB, c.get('user').id, resultId, body.note, now());
      await syncFixtureForResult(c.env.DB, resultId, now());
      return c.json({ result: await serializeResolvedResult(c.env.DB, result) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Result could not be disputed', 400));
    }
  });

  return routes;
}
