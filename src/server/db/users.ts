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
  is_master_admin: number;
  profile_image_url: string | null;
  darts_counter_url: string | null;
  created_at: string;
  last_login_at: string;
}

export interface PublicUserSummary {
  id: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  profileImageUrl: string | null;
  dartsCounterUrl: string | null;
  isMasterAdmin: boolean;
}

export function publicUser(user: Pick<UserRecord, 'id' | 'username' | 'role' | 'status' | 'profile_image_url' | 'darts_counter_url' | 'is_master_admin'>): PublicUserSummary {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    profileImageUrl: user.profile_image_url ?? null,
    dartsCounterUrl: user.darts_counter_url ?? null,
    isMasterAdmin: user.is_master_admin === 1,
  };
}

export async function getUserByGoogleSub(db: D1Database, googleSub: string): Promise<UserRecord | null> {
  return (await db.prepare('SELECT * FROM users WHERE google_sub = ?').bind(googleSub).first<UserRecord>()) ?? null;
}

export async function getUserById(db: D1Database, userId: string): Promise<UserRecord | null> {
  return (await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRecord>()) ?? null;
}

async function countAdmins(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'").first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function upsertGoogleUser(
  db: D1Database,
  identity: GoogleIdentity,
  now = new Date(),
  bootstrapAdminEmail?: string,
  masterAdminEmail?: string,
): Promise<UserRecord> {
  const timestamp = now.toISOString();
  let user = await getUserByGoogleSub(db, identity.sub);

  if (user) {
    await db.prepare('UPDATE users SET email = ?, last_login_at = ? WHERE id = ?')
      .bind(identity.email, timestamp, user.id).run();
  } else {
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO users (id, google_sub, email, username, role, status, is_master_admin, created_at, last_login_at)
       VALUES (?, ?, ?, NULL, 'PLAYER', 'ACTIVE', 0, ?, ?)`,
    ).bind(id, identity.sub, identity.email, timestamp, timestamp).run();
    user = await getUserById(db, id);
  }

  if (!user) throw new Error('User could not be loaded after Google sign-in');

  if (identity.picture) {
    await db.prepare('UPDATE users SET profile_image_url = ? WHERE id = ?')
      .bind(identity.picture, user.id).run();
  }

  const configuredMasterEmail = (masterAdminEmail ?? bootstrapAdminEmail)?.trim().toLowerCase();
  if (configuredMasterEmail && user.email.toLowerCase() === configuredMasterEmail) {
    await db.prepare("UPDATE users SET role = 'ADMIN', is_master_admin = 1 WHERE id = ?").bind(user.id).run();
  } else {
    await db.prepare('UPDATE users SET is_master_admin = 0 WHERE id = ?').bind(user.id).run();
    if (
      bootstrapAdminEmail &&
      user.email.toLowerCase() === bootstrapAdminEmail.trim().toLowerCase() &&
      (await countAdmins(db)) === 0
    ) {
      await db.prepare("UPDATE users SET role = 'ADMIN' WHERE id = ?").bind(user.id).run();
    }
  }

  return (await getUserById(db, user.id))!;
}

export async function setUsernameAndJoinLeague(
  db: D1Database,
  userId: string,
  username: string,
  now = new Date(),
): Promise<UserRecord> {
  const timestamp = now.toISOString();
  await db.prepare('UPDATE users SET username = ?, last_login_at = ? WHERE id = ?')
    .bind(username, timestamp, userId).run();
  const user = await getUserById(db, userId);
  if (!user) throw new Error('User could not be loaded after onboarding');
  return user;
}
