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

export async function hashClubInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return encodeBase64Url(new Uint8Array(digest));
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
