import type { Env } from '../env';

export const SESSION_COOKIE = 'misfits_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  isMasterAdmin: boolean;
}

interface SessionRow extends AuthUser {
  is_master_admin: number;
  token_hash: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hashSessionToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function issueSession(
  db: D1Database,
  userId: string,
  now = new Date(),
): Promise<{ token: string; tokenHash: string; expiresAt: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = encodeBase64Url(bytes);
  const tokenHash = await hashSessionToken(token);
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).bind(tokenHash, userId, createdAt, expiresAt).run();

  return { token, tokenHash, expiresAt };
}

export async function resolveSession(
  db: D1Database,
  rawToken: string | null | undefined,
  now = new Date(),
): Promise<AuthUser | null> {
  if (!rawToken) return null;
  const tokenHash = await hashSessionToken(rawToken);
  const row = await db.prepare(
    `SELECT users.id, users.username, users.role, users.status, users.is_master_admin,
            sessions.token_hash, sessions.user_id, sessions.created_at, sessions.expires_at
       FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  ).bind(tokenHash, now.toISOString()).first<SessionRow>();

  if (!row || row.status !== 'ACTIVE') return null;
  return { id: row.id, username: row.username, role: row.role, status: row.status, isMasterAdmin: row.is_master_admin === 1 };
}

export async function revokeSession(db: D1Database, rawToken: string | null | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = await hashSessionToken(rawToken);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function expiredCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function oauthStateCookie(state: string): string {
  return `misfits_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function envForSession(env: Env): Pick<Env, 'DB'> {
  return env;
}
