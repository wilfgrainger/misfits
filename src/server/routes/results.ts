import { Hono } from 'hono';
import { requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { AppError, jsonError } from '../errors';
import { getPlayerResults, getPublicResults, getLeagueStandings, serializeResult, submitPlayerResult, confirmResult, disputeResult } from '../db/results';

interface ResultRouteDependencies {
  now?: () => Date;
}

export function createResultRoutes(dependencies: ResultRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.get('/api/public/leagues/:leagueId/standings', async (c) => {
    try {
      return c.json({ standings: await getLeagueStandings(c.env.DB, c.req.param('leagueId')) }, 200, { 'Cache-Control': 'public, max-age=15' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Standings could not be loaded', 400));
    }
  });

  routes.get('/api/public/leagues/:leagueId/results', async (c) => {
    const results = await getPublicResults(c.env.DB, c.req.param('leagueId'));
    return c.json({ results: results.map(serializeResult) }, 200, { 'Cache-Control': 'public, max-age=15' });
  });

  routes.get('/api/me/results', requireUser, async (c) => {
    const results = await getPlayerResults(c.env.DB, c.get('user').id);
    return c.json({ results: results.map(serializeResult) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/leagues/:leagueId/results', requireSameOrigin, requireUser, async (c) => {
    try {
      const result = await submitPlayerResult(c.env.DB, c.get('user').id, c.req.param('leagueId'), await c.req.json().catch(() => null), now());
      return c.json({ result: serializeResult(result) }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('INVALID_RESULT', 'Result could not be recorded', 400));
    }
  });

  routes.post('/api/results/:resultId/confirm', requireSameOrigin, requireUser, async (c) => {
    try {
      const result = await confirmResult(c.env.DB, c.get('user').id, c.req.param('resultId'), now());
      return c.json({ result: serializeResult(result) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Result could not be confirmed', 400));
    }
  });

  routes.post('/api/results/:resultId/dispute', requireSameOrigin, requireUser, async (c) => {
    const body = await c.req.json().catch(() => null) as { note?: unknown } | null;
    if (typeof body?.note !== 'string') return jsonError(c, new AppError('INVALID_RESULT', 'A dispute note is required', 400));
    try {
      const result = await disputeResult(c.env.DB, c.get('user').id, c.req.param('resultId'), body.note, now());
      return c.json({ result: serializeResult(result) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Result could not be disputed', 400));
    }
  });

  return routes;
}
