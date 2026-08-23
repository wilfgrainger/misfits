import { Hono } from 'hono';
import type { Env } from '../env';
import { AppError, jsonError } from '../errors';
import { requireAdmin, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { listAdminPlayers, updateAdminPlayer, type AdminPlayerChanges } from '../db/admin';
import { createClubInvite, listClubInvites, revokeClubInvite, type ClubInviteRecord } from '../db/club-invites';
import type { ClubStatus, UserRole, UserStatus } from '../db/users';

interface AdminRouteDependencies {
  now?: () => Date;
}

function publicPlayer(player: {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  club_status: ClubStatus;
  created_at: string;
  league_active?: number;
  is_master_admin?: number;
}) {
  return {
    id: player.id,
    email: player.email,
    username: player.username,
    role: player.role,
    status: player.status,
    clubStatus: player.club_status,
    createdAt: player.created_at,
    leagueActive: player.league_active === 1,
    isMasterAdmin: player.is_master_admin === 1,
  };
}

function publicClubInvite(invite: ClubInviteRecord) {
  return {
    id: invite.id,
    createdBy: invite.created_by,
    expiresAt: invite.expires_at,
    uses: invite.uses,
    revokedAt: invite.revoked_at,
    createdAt: invite.created_at,
  };
}

function parseExpiry(value: unknown, now: Date): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError('VALIDATION_ERROR', 'Invite expiry must be an ISO date', 400);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new AppError('VALIDATION_ERROR', 'Invite expiry must be an ISO date', 400);
  if (parsed.getTime() <= now.getTime()) throw new AppError('VALIDATION_ERROR', 'Invite expiry must be in the future', 400);
  return parsed.toISOString();
}

export function createAdminRoutes(dependencies: AdminRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv & { Bindings: Env }>();
  const now = dependencies.now ?? (() => new Date());

  routes.get('/api/admin/players', requireUser, requireAdmin, async (c) => {
    const players = await listAdminPlayers(c.env.DB);
    return c.json({ players: players.map(publicPlayer) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.patch('/api/admin/players/:id', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null) as { role?: unknown; status?: unknown; clubStatus?: unknown } | null;
    if (!body || (body.role === undefined && body.status === undefined && body.clubStatus === undefined)) {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A role, status or club membership state is required', 400));
    }
    if (body.role !== undefined && body.role !== 'PLAYER' && body.role !== 'ADMIN') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Role must be PLAYER or ADMIN', 400));
    }
    if (body.status !== undefined && body.status !== 'ACTIVE' && body.status !== 'SUSPENDED') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Status must be ACTIVE or SUSPENDED', 400));
    }
    if (body.clubStatus !== undefined && body.clubStatus !== 'PENDING' && body.clubStatus !== 'APPROVED' && body.clubStatus !== 'REJECTED') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Club status must be PENDING, APPROVED or REJECTED', 400));
    }

    const changes: AdminPlayerChanges = {
      ...(body.role === undefined ? {} : { role: body.role as UserRole }),
      ...(body.status === undefined ? {} : { status: body.status as UserStatus }),
      ...(body.clubStatus === undefined ? {} : { clubStatus: body.clubStatus as ClubStatus }),
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

  routes.get('/api/admin/club-invites', requireUser, requireAdmin, async (c) => {
    const invites = await listClubInvites(c.env.DB);
    return c.json({ invites: invites.map(publicClubInvite) }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/admin/club-invites', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => ({})) as { expiresAt?: unknown };
    try {
      const at = now();
      const expiresAt = parseExpiry(body?.expiresAt, at);
      const created = await createClubInvite(c.env.DB, c.get('user').id, at, expiresAt);
      return c.json({
        invite: {
          ...publicClubInvite(created.invite),
          url: `${c.env.APP_ORIGIN}/join/${created.token}`,
        },
      }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Club invitation could not be created', 400));
    }
  });

  routes.post('/api/admin/club-invites/:id/revoke', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    try {
      const invite = await revokeClubInvite(c.env.DB, c.get('user').id, c.req.param('id'), now());
      return c.json({ invite: publicClubInvite(invite) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Club invitation could not be revoked', 400));
    }
  });

  return routes;
}
