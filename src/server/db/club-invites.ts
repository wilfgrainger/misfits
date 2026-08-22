import { AppError } from '../errors';

export interface ClubInviteRecord {
  id: string;
  token_hash: string;
  created_by: string;
  expires_at: string | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createClubInviteToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashClubInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function getClubInviteById(db: D1Database, inviteId: string): Promise<ClubInviteRecord | null> {
  return (await db.prepare(
    `SELECT id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM club_invites WHERE id = ?`,
  ).bind(inviteId).first<ClubInviteRecord>()) ?? null;
}

export async function listClubInvites(db: D1Database): Promise<ClubInviteRecord[]> {
  const result = await db.prepare(
    `SELECT id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM club_invites ORDER BY created_at DESC`,
  ).all<ClubInviteRecord>();
  return result.results;
}

export async function createClubInvite(
  db: D1Database,
  actorUserId: string,
  now = new Date(),
  expiresAt: string | null = null,
): Promise<{ invite: ClubInviteRecord; token: string }> {
  const token = createClubInviteToken();
  const tokenHash = await hashClubInviteToken(token);
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.prepare(
    `INSERT INTO club_invites (id, token_hash, created_by, expires_at, uses, revoked_at, created_at)
     VALUES (?, ?, ?, ?, 0, NULL, ?)`,
  ).bind(id, tokenHash, actorUserId, expiresAt, timestamp).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'CLUB_INVITE_CREATED', 'CLUB_INVITE', ?, NULL, ?, ?)`,
  ).bind(actorUserId, id, JSON.stringify({ expiresAt }), timestamp).run();
  const invite = await getClubInviteById(db, id);
  if (!invite) throw new Error('Club invite could not be loaded after creation');
  return { invite, token };
}

export async function validateClubInvite(
  db: D1Database,
  token: string,
  now = new Date(),
): Promise<ClubInviteRecord> {
  const tokenHash = await hashClubInviteToken(token);
  const invite = await db.prepare(
    `SELECT id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM club_invites WHERE token_hash = ?`,
  ).bind(tokenHash).first<ClubInviteRecord>();

  if (!invite) throw new AppError('INVITE_INVALID', 'That invitation is not valid', 404);
  if (invite.revoked_at) throw new AppError('INVITE_REVOKED', 'That invitation has been revoked', 409);
  if (invite.expires_at && invite.expires_at <= now.toISOString()) {
    throw new AppError('INVITE_EXPIRED', 'That invitation has expired', 409);
  }
  return invite;
}

export async function consumeClubInvite(db: D1Database, inviteId: string): Promise<void> {
  await db.prepare('UPDATE club_invites SET uses = uses + 1 WHERE id = ?').bind(inviteId).run();
}

export async function revokeClubInvite(
  db: D1Database,
  actorUserId: string,
  inviteId: string,
  now = new Date(),
): Promise<ClubInviteRecord> {
  const invite = await getClubInviteById(db, inviteId);
  if (!invite) throw new AppError('INVITE_INVALID', 'Club invitation was not found', 404);
  if (invite.revoked_at) return invite;
  const timestamp = now.toISOString();
  await db.prepare('UPDATE club_invites SET revoked_at = ? WHERE id = ?').bind(timestamp, inviteId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'CLUB_INVITE_REVOKED', 'CLUB_INVITE', ?, ?, ?, ?)`,
  ).bind(actorUserId, inviteId, JSON.stringify({ revokedAt: null }), JSON.stringify({ revokedAt: timestamp }), timestamp).run();
  const revoked = await getClubInviteById(db, inviteId);
  if (!revoked) throw new Error('Club invite could not be loaded after revocation');
  return revoked;
}
