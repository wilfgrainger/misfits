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
