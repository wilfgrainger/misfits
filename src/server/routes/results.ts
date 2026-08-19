import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import { errorPayload } from '../errors';
import { requireSameOrigin, requireUser, type AppVariables } from '../auth/guards';
import { getLeague, isActiveLeagueMember, listOpponents } from '../db/leagues';
import {
  createPendingMatch,
  getMatchById,
  getPlayerResultById,
  listUserMatches,
  resolvePendingMatch,
} from '../db/matches';
import { validatePlayerScore } from '../domain/matches';

type AppEnv = { Bindings: Env; Variables: AppVariables };
const submitSchema = z.object({
  opponentId: z.string().min(1),
  myLegs: z.number().int().nonnegative(),
  opponentLegs: z.number().int().nonnegative(),
}).strict();
const disputeSchema = z.object({ note: z.string().max(500).optional() }).strict();

function noStore(c: { header(name: string, value: string): void }) {
  c.header('Cache-Control', 'private, no-store');
}

export function createResultRoutes() {
  const routes = new Hono<AppEnv>();

  routes.get('/api/me/opponents', requireUser, async (c) => {
    noStore(c);
    const user = c.get('user');
    if (user.status !== 'ACTIVE') return c.json(errorPayload('FORBIDDEN', 'Your player account is suspended.'), 403);
    return c.json({ opponents: await listOpponents(c.env.DB, user.id) });
  });

  routes.get('/api/me/results', requireUser, async (c) => {
    noStore(c);
    const user = c.get('user');
    const results = await listUserMatches(c.env.DB, user.id);
    return c.json({
      results: results.map((result) => ({
        ...result,
        canRespond: result.status === 'PENDING' && result.playerBId === user.id && user.status === 'ACTIVE',
      })),
    });
  });

  routes.post('/api/results', requireSameOrigin, requireUser, async (c) => {
    noStore(c);
    const user = c.get('user');
    if (user.status !== 'ACTIVE') return c.json(errorPayload('FORBIDDEN', 'Your player account is suspended.'), 403);

    const league = await getLeague(c.env.DB);
    if (league.status !== 'OPEN') return c.json(errorPayload('LEAGUE_CLOSED', 'This league is closed for new results.'), 409);
    if (!await isActiveLeagueMember(c.env.DB, user.id, league.id)) {
      return c.json(errorPayload('FORBIDDEN', 'You are not an active member of this league.'), 403);
    }

    let parsed;
    try {
      parsed = submitSchema.safeParse(await c.req.json());
    } catch {
      parsed = { success: false } as const;
    }
    if (!parsed.success) return c.json(errorPayload('VALIDATION_ERROR', 'Enter a valid opponent and score.'), 400);
    const { opponentId, myLegs, opponentLegs } = parsed.data;
    if (opponentId === user.id || !await isActiveLeagueMember(c.env.DB, opponentId, league.id)) {
      return c.json(errorPayload('OPPONENT_UNAVAILABLE', 'That opponent is not available in this league.'), 409);
    }
    if (!validatePlayerScore(myLegs, opponentLegs, league.target_legs).ok) {
      return c.json(errorPayload('INVALID_RESULT', `Results must be a valid race to ${league.target_legs}.`), 400);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await createPendingMatch(c.env.DB, {
      id,
      leagueId: league.id,
      actorId: user.id,
      opponentId,
      actorLegs: myLegs,
      opponentLegs,
      now,
    });
    const result = await getPlayerResultById(c.env.DB, id);
    return c.json({ result }, 201);
  });

  async function resolve(c: any, status: 'CONFIRMED' | 'DISPUTED') {
    noStore(c);
    const user = c.get('user') as AppVariables['user'];
    if (user.status !== 'ACTIVE') return c.json(errorPayload('FORBIDDEN', 'Your player account is suspended.'), 403);
    if (!await isActiveLeagueMember(c.env.DB, user.id)) {
      return c.json(errorPayload('FORBIDDEN', 'You are not an active member of this league.'), 403);
    }
    const id = c.req.param('id') as string;
    const match = await getMatchById(c.env.DB, id);
    if (!match) return c.json(errorPayload('NOT_FOUND', 'Result not found.'), 404);
    if (match.status !== 'PENDING') {
      return c.json(errorPayload('RESULT_ALREADY_RESOLVED', 'This result has already been resolved.'), 409);
    }
    if (match.player_b_id !== user.id) {
      return c.json(errorPayload('FORBIDDEN', 'Only the opposing player can resolve this result.'), 403);
    }

    let note: string | null = null;
    if (status === 'DISPUTED') {
      let parsed;
      try {
        parsed = disputeSchema.safeParse(await c.req.json());
      } catch {
        parsed = disputeSchema.safeParse({});
      }
      if (!parsed.success) return c.json(errorPayload('VALIDATION_ERROR', 'Dispute notes must be 500 characters or fewer.'), 400);
      note = parsed.data.note?.trim() || null;
    }

    const changed = await resolvePendingMatch(c.env.DB, {
      id,
      opponentId: user.id,
      status,
      note,
      now: new Date().toISOString(),
    });
    if (!changed) return c.json(errorPayload('RESULT_ALREADY_RESOLVED', 'This result has already been resolved.'), 409);
    return c.json({ result: await getPlayerResultById(c.env.DB, id) });
  }

  routes.post('/api/results/:id/confirm', requireSameOrigin, requireUser, (c) => resolve(c, 'CONFIRMED'));
  routes.post('/api/results/:id/dispute', requireSameOrigin, requireUser, (c) => resolve(c, 'DISPUTED'));

  return routes;
}
