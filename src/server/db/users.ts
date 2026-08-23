import type { GoogleIdentity } from '../auth/google';

export type UserRole = 'PLAYER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserRecord {
  id: string;
  google_sub: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  club_status: ClubStatus;
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
  clubStatus: ClubStatus;
  profileImageUrl: string | null;
  dartsCounterUrl: string | null;
  isMasterAdmin: boolean;
}

export function publicUser(user: Pick<UserRecord, 'id' | 'username' | 'role' | 'status' | 'club_status' | 'profile_image_url' | 'darts_counter_url' | 'is_master_admin'>): PublicUserSummary {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    clubStatus: user.club_status,
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

async function updateGoogleProfile(
  db: D1Database,
  userId: string,
  identity: GoogleIdentity,
  now: Date,
): Promise<void> {
  await db.prepare('UPDATE users SET email = ?, last_login_at = ? WHERE id = ?')
    .bind(identity.email, now.toISOString(), userId).run();
  if (identity.picture) {
    await db.prepare('UPDATE users SET profile_image_url = ? WHERE id = ?')
      .bind(identity.picture, userId).run();
  }
}

async function applyConfiguredAdmin(
  db: D1Database,
  user: UserRecord,
  bootstrapAdminEmail?: string,
  masterAdminEmail?: string,
): Promise<void> {
  const masterEmail = masterAdminEmail?.trim().toLowerCase();
  const bootstrapEmail = bootstrapAdminEmail?.trim().toLowerCase();
  const email = user.email.toLowerCase();

  if ((masterEmail && email === masterEmail) || (!masterEmail && bootstrapEmail && email === bootstrapEmail)) {
    await db.prepare("UPDATE users SET role = 'ADMIN', is_master_admin = 1, club_status = 'APPROVED' WHERE id = ?").bind(user.id).run();
    return;
  }

  await db.prepare('UPDATE users SET is_master_admin = 0 WHERE id = ?').bind(user.id).run();
  if (bootstrapEmail && email === bootstrapEmail && (await countAdmins(db)) === 0) {
    await db.prepare("UPDATE users SET role = 'ADMIN', club_status = 'APPROVED' WHERE id = ?").bind(user.id).run();
  }
}

export async function refreshGoogleUser(
  db: D1Database,
  user: UserRecord,
  identity: GoogleIdentity,
  now = new Date(),
  bootstrapAdminEmail?: string,
  masterAdminEmail?: string,
): Promise<UserRecord> {
  await updateGoogleProfile(db, user.id, identity, now);
  const refreshed = await getUserById(db, user.id);
  if (!refreshed) throw new Error('User could not be loaded after Google sign-in');
  await applyConfiguredAdmin(db, refreshed, bootstrapAdminEmail, masterAdminEmail);
  return (await getUserById(db, user.id))!;
}

export async function createPendingInvitedUser(
  db: D1Database,
  identity: GoogleIdentity,
  now = new Date(),
): Promise<UserRecord> {
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.prepare(
    `INSERT INTO users (id, google_sub, email, username, role, status, club_status, is_master_admin, created_at, last_login_at)
     VALUES (?, ?, ?, NULL, 'PLAYER', 'ACTIVE', 'PENDING', 0, ?, ?)`,
  ).bind(id, identity.sub, identity.email, timestamp, timestamp).run();
  if (identity.picture) {
    await db.prepare('UPDATE users SET profile_image_url = ? WHERE id = ?')
      .bind(identity.picture, id).run();
  }
  const user = await getUserById(db, id);
  if (!user) throw new Error('User could not be loaded after invited sign-in');
  return user;
}

export async function upsertGoogleUser(
  db: D1Database,
  identity: GoogleIdentity,
  now = new Date(),
  bootstrapAdminEmail?: string,
  masterAdminEmail?: string,
): Promise<UserRecord> {
  const existing = await getUserByGoogleSub(db, identity.sub);
  if (existing) return refreshGoogleUser(db, existing, identity, now, bootstrapAdminEmail, masterAdminEmail);

  const user = await createPendingInvitedUser(db, identity, now);
  await applyConfiguredAdmin(db, user, bootstrapAdminEmail, masterAdminEmail);
  return (await getUserById(db, user.id))!;
}

export async function setUsername(
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
