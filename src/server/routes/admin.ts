import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import { errorPayload } from '../errors';
import { requireAdmin, requireSameOrigin, requireUser, type AppVariables } from '../auth/guards';
import { listAudit, prepareAudit } from '../db/audit';
import { getLeague, isActiveLeagueMember } from '../db/leagues';
import {
  getMatchById,
  getPlayerResultById,
  listAllResults,
  prepareConfirmedMatchInsert,
  prepareMatchDelete,
  prepareMatchUpdate,
  type MatchRecord,
} from '../db/matches';
import {
  countActiveAdmins,
  getAdminPlayer,
  listAdminPlayers,
  type AdminPlayerDto,
} from '../db/users';
import { validatePlayerScore } from '../domain/matches';
import { validateUsername } from '../domain/username';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const playerPatchSchema = z.object({
  role: z.enum(['PLAYER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  leagueActive: z.boolean().optional(),
  username: z.string().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

const manualResultSchema = z.object({
  playerAId: z.string().min(1),
  playerBId: z.string().min(1),
  playerALegs: z.number().int().nonnegative(),
  playerBLegs: z.number().int().nonnegative(),
}).strict();

const resultPatchSchema = z.object({
  playerALegs: z.number().int().nonnegative().optional(),
  playerBLegs: z.number().int().nonnegative().optional(),
  status: z.enum(['CONFIRMED', 'DISPUTED']).optional(),
  disputeNote: z.string().max(500).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

const leaguePatchSchema = z.object({
  seasonName: z.string().trim().min(1).max(80).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  pointsPerWin: z.number().int().min(0).max(100).optional(),
  targetLegs: z.number().int().min(1).max(99).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

function noStore(c: { header(name: string, value: string): void }) {
  c.header('Cache-Control', 'private, no-store');
}

function usernameConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('unique') && message.toLowerCase().includes('username');
}

async function jsonBody(c: any): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export function createAdminRoutes() {
  const routes = new Hono<AppEnv>();
  routes.use('/api/admin/*', requireSameOrigin, requireUser, requireAdmin);

  routes.get('/api/admin/summary', async (c) => {
    noStore(c);
    const league = await getLeague(c.env.DB);
    const players = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM league_players WHERE league_id = ? AND active = 1",
    ).bind(league.id).first<{ count: number }>();
    const results = await c.env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) AS disputed,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed
      FROM matches WHERE league_id = ?
    `).bind(league.id).first<{ total: number; pending: number; disputed: number; confirmed: number }>();
    return c.json({
      league,
      counts: {
        players: Number(players?.count ?? 0),
        results: Number(results?.total ?? 0),
        pending: Number(results?.pending ?? 0),
        disputed: Number(results?.disputed ?? 0),
        confirmed: Number(results?.confirmed ?? 0),
      },
    });
  });

  routes.get('/api/admin/players', async (c) => {
    noStore(c);
    return c.json({ players: await listAdminPlayers(c.env.DB) });
  });

  routes.patch('/api/admin/players/:id', async (c) => {
    noStore(c);
    const actor = c.get('user');
    const id = c.req.param('id');
    const before = await getAdminPlayer(c.env.DB, id);
    if (!before) return c.json(errorPayload('NOT_FOUND', 'Player not found.'), 404);
    const parsed = playerPatchSchema.safeParse(await jsonBody(c));
    if (!parsed.success) return c.json(errorPayload('VALIDATION_ERROR', 'Enter valid player settings.'), 400);
    const patch = parsed.data;

    let username = before.username;
    if (patch.username !== undefined) {
      const validation = validateUsername(patch.username);
      if (!validation.ok) return c.json(errorPayload('VALIDATION_ERROR', 'Enter a valid username.'), 400);
      username = validation.value;
    }
    const role = patch.role ?? before.role;
    const status = patch.status ?? before.status;
    const leagueActive = patch.leagueActive ?? before.leagueActive;
    if (before.role === 'ADMIN' && before.status === 'ACTIVE' && (role !== 'ADMIN' || status !== 'ACTIVE')) {
      if (await countActiveAdmins(c.env.DB) <= 1) {
        return c.json(errorPayload('VALIDATION_ERROR', 'The final active administrator cannot be demoted or suspended.'), 409);
      }
    }

    const now = new Date().toISOString();
    const after: AdminPlayerDto = {
      ...before,
      username,
      role,
      status,
      leagueActive,
      joinedAt: leagueActive ? (before.joinedAt ?? now) : before.joinedAt,
    };
    const statements: D1PreparedStatement[] = [
      c.env.DB.prepare('UPDATE users SET username = ?, role = ?, status = ? WHERE id = ?')
        .bind(username, role, status, id),
    ];
    if (patch.leagueActive !== undefined) {
      statements.push(c.env.DB.prepare(`
        INSERT INTO league_players (league_id, user_id, active, joined_at)
        VALUES ('misfits-501', ?, ?, ?)
        ON CONFLICT(league_id, user_id) DO UPDATE SET active = excluded.active
      `).bind(id, leagueActive ? 1 : 0, before.joinedAt ?? now));
    }
    statements.push(prepareAudit(c.env.DB, {
      actorUserId: actor.id,
      action: 'player.updated',
      entityType: 'player',
      entityId: id,
      before,
      after,
    }, now));
    try {
      await c.env.DB.batch(statements);
    } catch (error) {
      if (usernameConflict(error)) return c.json(errorPayload('USERNAME_UNAVAILABLE', 'That username is already taken.'), 409);
      throw error;
    }
    return c.json({ player: await getAdminPlayer(c.env.DB, id) });
  });

  routes.get('/api/admin/results', async (c) => {
    noStore(c);
    return c.json({ results: await listAllResults(c.env.DB) });
  });

  routes.post('/api/admin/results', async (c) => {
    noStore(c);
    const actor = c.get('user');
    const parsed = manualResultSchema.safeParse(await jsonBody(c));
    if (!parsed.success) return c.json(errorPayload('VALIDATION_ERROR', 'Enter a valid result.'), 400);
    const input = parsed.data;
    const league = await getLeague(c.env.DB);
    if (
      input.playerAId === input.playerBId
      || !await isActiveLeagueMember(c.env.DB, input.playerAId, league.id)
      || !await isActiveLeagueMember(c.env.DB, input.playerBId, league.id)
    ) {
      return c.json(errorPayload('OPPONENT_UNAVAILABLE', 'Both players must be active league members.'), 409);
    }
    if (!validatePlayerScore(input.playerALegs, input.playerBLegs, league.target_legs).ok) {
      return c.json(errorPayload('INVALID_RESULT', `Results must be a valid race to ${league.target_legs}.`), 400);
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const snapshot = {
      id,
      league_id: league.id,
      player_a_id: input.playerAId,
      player_b_id: input.playerBId,
      player_a_legs: input.playerALegs,
      player_b_legs: input.playerBLegs,
      submitted_by: actor.id,
      status: 'CONFIRMED',
      confirmed_by: actor.id,
      dispute_note: null,
      created_at: now,
      updated_at: now,
      confirmed_at: now,
    };
    await c.env.DB.batch([
      prepareConfirmedMatchInsert(c.env.DB, {
        id,
        leagueId: league.id,
        playerAId: input.playerAId,
        playerBId: input.playerBId,
        playerALegs: input.playerALegs,
        playerBLegs: input.playerBLegs,
        adminId: actor.id,
        now,
      }),
      prepareAudit(c.env.DB, {
        actorUserId: actor.id,
        action: 'result.created',
        entityType: 'result',
        entityId: id,
        before: null,
        after: snapshot,
      }, now),
    ]);
    return c.json({ result: await getPlayerResultById(c.env.DB, id) }, 201);
  });

  routes.patch('/api/admin/results/:id', async (c) => {
    noStore(c);
    const actor = c.get('user');
    const id = c.req.param('id');
    const before = await getMatchById(c.env.DB, id);
    if (!before) return c.json(errorPayload('NOT_FOUND', 'Result not found.'), 404);
    const parsed = resultPatchSchema.safeParse(await jsonBody(c));
    if (!parsed.success) return c.json(errorPayload('VALIDATION_ERROR', 'Enter a valid result correction.'), 400);
    const patch = parsed.data;
    const league = await getLeague(c.env.DB, before.league_id);
    const playerALegs = patch.playerALegs ?? before.player_a_legs;
    const playerBLegs = patch.playerBLegs ?? before.player_b_legs;
    if (!validatePlayerScore(playerALegs, playerBLegs, league.target_legs).ok) {
      return c.json(errorPayload('INVALID_RESULT', `Results must be a valid race to ${league.target_legs}.`), 400);
    }
    const now = new Date().toISOString();
    const status = patch.status ?? before.status;
    const after: MatchRecord = {
      ...before,
      player_a_legs: playerALegs,
      player_b_legs: playerBLegs,
      status,
      confirmed_by: patch.status ? actor.id : before.confirmed_by,
      confirmed_at: patch.status === 'CONFIRMED' ? now : patch.status === 'DISPUTED' ? null : before.confirmed_at,
      dispute_note: status === 'CONFIRMED'
        ? null
        : patch.disputeNote === undefined ? before.dispute_note : patch.disputeNote?.trim() || null,
      updated_at: now,
    };
    await c.env.DB.batch([
      prepareMatchUpdate(c.env.DB, after),
      prepareAudit(c.env.DB, {
        actorUserId: actor.id,
        action: 'result.updated',
        entityType: 'result',
        entityId: id,
        before,
        after,
      }, now),
    ]);
    return c.json({ result: await getPlayerResultById(c.env.DB, id) });
  });

  routes.delete('/api/admin/results/:id', async (c) => {
    noStore(c);
    const actor = c.get('user');
    const id = c.req.param('id');
    const before = await getMatchById(c.env.DB, id);
    if (!before) return c.json(errorPayload('NOT_FOUND', 'Result not found.'), 404);
    const now = new Date().toISOString();
    await c.env.DB.batch([
      prepareMatchDelete(c.env.DB, id),
      prepareAudit(c.env.DB, {
        actorUserId: actor.id,
        action: 'result.deleted',
        entityType: 'result',
        entityId: id,
        before,
        after: null,
      }, now),
    ]);
    return c.body(null, 204);
  });

  routes.patch('/api/admin/league', async (c) => {
    noStore(c);
    const actor = c.get('user');
    const before = await getLeague(c.env.DB);
    const parsed = leaguePatchSchema.safeParse(await jsonBody(c));
    if (!parsed.success) return c.json(errorPayload('VALIDATION_ERROR', 'Enter valid league settings.'), 400);
    const patch = parsed.data;
    const now = new Date().toISOString();
    const after = {
      ...before,
      season_name: patch.seasonName ?? before.season_name,
      status: patch.status ?? before.status,
      points_per_win: patch.pointsPerWin ?? before.points_per_win,
      target_legs: patch.targetLegs ?? before.target_legs,
      updated_at: now,
    };
    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE leagues SET season_name = ?, status = ?, points_per_win = ?, target_legs = ?, updated_at = ?
        WHERE id = ?
      `).bind(after.season_name, after.status, after.points_per_win, after.target_legs, now, before.id),
      prepareAudit(c.env.DB, {
        actorUserId: actor.id,
        action: 'league.updated',
        entityType: 'league',
        entityId: before.id,
        before,
        after,
      }, now),
    ]);
    return c.json({ league: await getLeague(c.env.DB, before.id) });
  });

  routes.get('/api/admin/audit', async (c) => {
    noStore(c);
    const requested = Number(c.req.query('limit') ?? 100);
    return c.json({ audit: await listAudit(c.env.DB, Number.isFinite(requested) ? requested : 100) });
  });

  return routes;
}
