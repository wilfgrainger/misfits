import type { AuthUser } from '../../shared/api';

export const SESSION_COOKIE = 'misfits_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hashSessionToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function issueSession(
  db: D1Database,
  userId: string,
  now = new Date(),
): Promise<{ token: string; expiresAt: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = bytesToBase64Url(bytes);
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).bind(tokenHash, userId, now.toISOString(), expiresAt).run();
  return { token, expiresAt };
}

export async function resolveSession(
  db: D1Database,
  rawToken: string,
  now = new Date(),
): Promise<AuthUser | null> {
  const tokenHash = await hashSessionToken(rawToken);
  const row = await db.prepare(`
    SELECT u.id, u.email, u.username, u.role, u.status, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).bind(tokenHash).first<AuthUser & { expires_at: string }>();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= now.getTime()) {
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    status: row.status,
  };
}

export async function revokeSession(db: D1Database, rawToken: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashSessionToken(rawToken)).run();
}

export function sessionCookie(token: string, maxAge = SESSION_MAX_AGE_SECONDS): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
