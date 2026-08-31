import { AppError } from '../errors';
import type { ClubStatus, UserRecord, UserRole, UserStatus } from './users';
import { getUserById } from './users';

export interface AdminPlayerRecord extends UserRecord {
  league_active: number;
}

export interface AdminPlayerChanges {
  role?: UserRole;
  status?: UserStatus;
  clubStatus?: ClubStatus;
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
    "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND club_status = 'APPROVED'",
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
  const nextClubStatus = changes.clubStatus ?? before.club_status;
  if (nextRole === before.role && nextStatus === before.status && nextClubStatus === before.club_status) return before;

  if (nextRole === 'ADMIN' && nextClubStatus !== 'APPROVED') {
    throw new AppError('VALIDATION_ERROR', 'Administrator role requires approved club membership', 409);
  }

  const removesActiveAdmin = before.role === 'ADMIN'
    && before.status === 'ACTIVE'
    && before.club_status === 'APPROVED'
    && (nextRole !== 'ADMIN' || nextStatus !== 'ACTIVE' || nextClubStatus !== 'APPROVED');

  if (removesActiveAdmin && (await countActiveAdmins(db)) <= 1) {
    throw new AppError('LAST_ADMIN_PROTECTED', 'The last active approved administrator cannot be removed, suspended or removed from the club', 409);
  }

  if (before.is_master_admin === 1 && removesActiveAdmin) {
    throw new AppError('MASTER_ADMIN_PROTECTED', 'The master administrator cannot be removed, suspended or removed from the club', 409);
  }

  const updatedAt = now.toISOString();
  const beforeAudit = { role: before.role, status: before.status, clubStatus: before.club_status };
  const afterAudit = { role: nextRole, status: nextStatus, clubStatus: nextClubStatus };
  const [updated] = await db.batch([
    db.prepare(
      `UPDATE users SET role = ?, status = ?, club_status = ?
        WHERE id = ?
          AND (? = 0 OR EXISTS (
            SELECT 1 FROM users other
             WHERE other.id <> ?
               AND other.role = 'ADMIN'
               AND other.status = 'ACTIVE'
               AND other.club_status = 'APPROVED'
          ))
          AND role = ? AND status = ? AND club_status = ?`,
    ).bind(
      nextRole,
      nextStatus,
      nextClubStatus,
      targetUserId,
      removesActiveAdmin ? 1 : 0,
      targetUserId,
      before.role,
      before.status,
      before.club_status,
    ),
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
       SELECT ?, 'ADMIN_PLAYER_UPDATED', 'USER', ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM users
           WHERE id = ? AND role = ? AND status = ? AND club_status = ?
        )`,
    ).bind(
      actorUserId,
      targetUserId,
      JSON.stringify(beforeAudit),
      JSON.stringify(afterAudit),
      updatedAt,
      targetUserId,
      nextRole,
      nextStatus,
      nextClubStatus,
    ),
  ]);

  if (updated.meta.changes !== 1) {
    if (removesActiveAdmin) {
      throw new AppError('LAST_ADMIN_PROTECTED', 'The last active approved administrator cannot be removed, suspended or removed from the club', 409);
    }
    throw new AppError('VALIDATION_ERROR', 'Administrator state changed before this update could be saved', 409);
  }

  const after = await getUserById(db, targetUserId);
  if (!after) throw new Error('User could not be loaded after administrator update');
  return after;
}