import { Hono } from 'hono';
import type { Env } from '../env';
import { AppError, jsonError } from '../errors';
import { requireAdmin, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { listAdminPlayers, updateAdminPlayer, type AdminPlayerChanges } from '../db/admin';
import type { UserRole, UserStatus } from '../db/users';

interface AdminRouteDependencies {
  now?: () => Date;
}

function publicPlayer(player: { id: string; email: string; username: string | null; role: UserRole; status: UserStatus; league_active?: number }) {
  return {
    id: player.id,
    email: player.email,
    username: player.username,
    role: player.role,
    status: player.status,
    leagueActive: player.league_active === 1,
  };
}

export function createAdminRoutes(dependencies: AdminRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv & { Bindings: Env }>();
  const now = dependencies.now ?? (() => new Date());

  routes.get('/api/admin/players', requireUser, requireAdmin, async (c) => {
    const players = await listAdminPlayers(c.env.DB);
    return c.json({ players: players.map(publicPlayer) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.patch('/api/admin/players/:id', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null) as { role?: unknown; status?: unknown } | null;
    if (!body || (body.role === undefined && body.status === undefined)) {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A role or status is required', 400));
    }
    if (body.role !== undefined && body.role !== 'PLAYER' && body.role !== 'ADMIN') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Role must be PLAYER or ADMIN', 400));
    }
    if (body.status !== undefined && body.status !== 'ACTIVE' && body.status !== 'SUSPENDED') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Status must be ACTIVE or SUSPENDED', 400));
    }

    const changes: AdminPlayerChanges = {
      ...(body.role === undefined ? {} : { role: body.role as UserRole }),
      ...(body.status === undefined ? {} : { status: body.status as UserStatus }),
    };
    try {
      const updated = await updateAdminPlayer(c.env.DB, c.get('user').id, c.req.param('id'), changes, now());
      const player = (await listAdminPlayers(c.env.DB)).find((candidate) => candidate.id === updated.id) ?? updated;
      return c.json({ player: publicPlayer(player) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Administrator update could not be saved', 400));
    }
  });

  return routes;
}
