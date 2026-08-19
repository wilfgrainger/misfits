import type { GoogleIdentity } from '../auth/google';

export type UserRole = 'PLAYER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface UserRecord {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at: string;
}

export function getUserByGoogleSub(db: D1Database, sub: string): Promise<UserRecord | null> {
  return db.prepare('SELECT * FROM users WHERE google_sub = ?').bind(sub).first<UserRecord>();
}

export function getUserById(db: D1Database, id: string): Promise<UserRecord | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRecord>();
}

export async function upsertGoogleUser(
  db: D1Database,
  identity: GoogleIdentity,
  now = new Date(),
): Promise<UserRecord> {
  const existing = await getUserByGoogleSub(db, identity.sub);
  const timestamp = now.toISOString();
  if (existing) {
    await db.prepare('UPDATE users SET email = ?, last_login_at = ? WHERE id = ?')
      .bind(identity.email, timestamp, existing.id).run();
    return { ...existing, email: identity.email, last_login_at: timestamp };
  }

  const user: UserRecord = {
    id: crypto.randomUUID(),
    google_sub: identity.sub,
    email: identity.email,
    username: null,
    role: 'PLAYER',
    status: 'ACTIVE',
    created_at: timestamp,
    last_login_at: timestamp,
  };
  await db.prepare(`
    INSERT INTO users (id, google_sub, email, username, role, status, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id, user.google_sub, user.email, null, user.role, user.status, user.created_at, user.last_login_at,
  ).run();
  return user;
}

export async function countAdmins(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'").first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function setUserRole(db: D1Database, userId: string, role: UserRole): Promise<void> {
  await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, userId).run();
}

export async function setUsernameAndJoinLeague(
  db: D1Database,
  userId: string,
  username: string,
  now = new Date(),
  leagueId = 'misfits-501',
): Promise<void> {
  const updateUser = db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(username, userId);
  const joinLeague = db.prepare(`
    INSERT INTO league_players (league_id, user_id, active, joined_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(league_id, user_id) DO UPDATE SET active = 1
  `).bind(leagueId, userId, now.toISOString());
  await db.batch([updateUser, joinLeague]);
}

export interface AdminPlayerDto {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  leagueActive: boolean;
  joinedAt: string | null;
  createdAt: string;
  lastLoginAt: string;
}

interface AdminPlayerRow {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  leagueActive: number;
  joinedAt: string | null;
  createdAt: string;
  lastLoginAt: string;
}

const ADMIN_PLAYER_SELECT = `
  SELECT
    u.id AS id,
    u.email AS email,
    u.username AS username,
    u.role AS role,
    u.status AS status,
    COALESCE(lp.active, 0) AS leagueActive,
    lp.joined_at AS joinedAt,
    u.created_at AS createdAt,
    u.last_login_at AS lastLoginAt
  FROM users u
  LEFT JOIN league_players lp ON lp.user_id = u.id AND lp.league_id = ?
`;

function mapAdminPlayer(row: AdminPlayerRow): AdminPlayerDto {
  return { ...row, leagueActive: row.leagueActive === 1 };
}

export async function getAdminPlayer(
  db: D1Database,
  userId: string,
  leagueId = 'misfits-501',
): Promise<AdminPlayerDto | null> {
  const row = await db.prepare(`${ADMIN_PLAYER_SELECT} WHERE u.id = ?`)
    .bind(leagueId, userId).first<AdminPlayerRow>();
  return row ? mapAdminPlayer(row) : null;
}

export async function listAdminPlayers(
  db: D1Database,
  leagueId = 'misfits-501',
): Promise<AdminPlayerDto[]> {
  const rows = await db.prepare(`${ADMIN_PLAYER_SELECT} ORDER BY COALESCE(u.username, u.email) COLLATE NOCASE ASC`)
    .bind(leagueId).all<AdminPlayerRow>();
  return rows.results.map(mapAdminPlayer);
}

export async function countActiveAdmins(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'")
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}
