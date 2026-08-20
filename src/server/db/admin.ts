import { AppError } from '../errors';
import type { UserRecord, UserRole, UserStatus } from './users';
import { getUserById } from './users';

export interface AdminPlayerRecord extends UserRecord {
  league_active: number;
}

export interface AdminPlayerChanges {
  role?: UserRole;
  status?: UserStatus;
}

export async function listAdminPlayers(db: D1Database): Promise<AdminPlayerRecord[]> {
  const result = await db.prepare(
    `SELECT users.*, CASE WHEN EXISTS (
              SELECT 1 FROM league_players
               WHERE league_players.user_id = users.id AND league_players.active = 1
            ) THEN 1 ELSE 0 END AS league_active
      FROM users
      ORDER BY users.created_at ASC, users.id ASC`,
  ).all<AdminPlayerRecord>();
  return result.results;
}

async function countActiveAdmins(db: D1Database): Promise<number> {
  const row = await db.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'",
  ).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function updateAdminPlayer(
  db: D1Database,
  actorUserId: string,
  targetUserId: string,
  changes: AdminPlayerChanges,
  now = new Date(),
): Promise<UserRecord> {
  const before = await getUserById(db, targetUserId);
  if (!before) throw new AppError('VALIDATION_ERROR', 'User was not found', 404);

  const nextRole = changes.role ?? before.role;
  const nextStatus = changes.status ?? before.status;
  if (nextRole === before.role && nextStatus === before.status) return before;

  if (
    before.role === 'ADMIN' &&
    before.status === 'ACTIVE' &&
    (nextRole !== 'ADMIN' || nextStatus !== 'ACTIVE') &&
    (await countActiveAdmins(db)) <= 1
  ) {
    throw new AppError('LAST_ADMIN_PROTECTED', 'The last active administrator cannot be removed or suspended', 409);
  }

  if (before.is_master_admin === 1 && (nextRole !== 'ADMIN' || nextStatus !== 'ACTIVE')) {
    throw new AppError('MASTER_ADMIN_PROTECTED', 'The master administrator cannot be removed or suspended', 409);
  }

  const updatedAt = now.toISOString();
  await db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?')
    .bind(nextRole, nextStatus, targetUserId).run();
  const after = await getUserById(db, targetUserId);
  if (!after) throw new Error('User could not be loaded after administrator update');

  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'ADMIN_PLAYER_UPDATED', 'USER', ?, ?, ?, ?)`,
  ).bind(actorUserId, targetUserId, JSON.stringify({ role: before.role, status: before.status }), JSON.stringify({ role: after.role, status: after.status }), updatedAt).run();

  return after;
}
