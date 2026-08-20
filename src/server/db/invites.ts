import { AppError } from '../errors';
import { getLeagueById, getMembership, type LeagueMemberRecord } from './leagues';
import { getUserById } from './users';

export interface InviteRecord {
  id: string;
  league_id: string;
  token_hash: string;
  created_by: string;
  expires_at: string | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
}

function leagueFull(): AppError {
  return new AppError('LEAGUE_FULL', 'This league has reached its player limit', 409);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return encodeBase64Url(new Uint8Array(digest));
}

function createInviteToken(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function getInviteByHash(db: D1Database, tokenHash: string): Promise<InviteRecord | null> {
  return (await db.prepare(
    `SELECT id, league_id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM league_invites WHERE token_hash = ?`,
  ).bind(tokenHash).first<InviteRecord>()) ?? null;
}

export async function getInviteById(db: D1Database, inviteId: string): Promise<InviteRecord | null> {
  return (await db.prepare(
    `SELECT id, league_id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM league_invites WHERE id = ?`,
  ).bind(inviteId).first<InviteRecord>()) ?? null;
}

export async function listLeagueInvites(db: D1Database, leagueId: string): Promise<InviteRecord[]> {
  const result = await db.prepare(
    `SELECT id, league_id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM league_invites WHERE league_id = ? ORDER BY created_at DESC`,
  ).bind(leagueId).all<InviteRecord>();
  return result.results;
}

export async function createInvite(
  db: D1Database,
  actorUserId: string,
  leagueId: string,
  now = new Date(),
  expiresAt: string | null = null,
): Promise<{ invite: InviteRecord; token: string }> {
  const league = await getLeagueById(db, leagueId);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  const token = createInviteToken();
  const tokenHash = await hashInviteToken(token);
  const id = crypto.randomUUID();
  const timestamp = now.toISOString();
  await db.prepare(
    `INSERT INTO league_invites (id, league_id, token_hash, created_by, expires_at, uses, revoked_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
  ).bind(id, leagueId, tokenHash, actorUserId, expiresAt, timestamp).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'INVITE_CREATED', 'LEAGUE_INVITE', ?, NULL, ?, ?)`,
  ).bind(actorUserId, id, JSON.stringify({ leagueId, expiresAt }), timestamp).run();
  const invite = await db.prepare(
    `SELECT id, league_id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM league_invites WHERE id = ?`,
  ).bind(id).first<InviteRecord>();
  if (!invite) throw new Error('Invite could not be loaded after creation');
  return { invite, token };
}

export async function joinLeagueByInvite(db: D1Database, userId: string, token: string, now = new Date()): Promise<LeagueMemberRecord> {
  const invite = await getInviteByHash(db, await hashInviteToken(token));
  if (!invite) throw new AppError('INVITE_INVALID', 'That invite link is not valid', 404);
  if (invite.revoked_at) throw new AppError('INVITE_REVOKED', 'That invite link has been revoked', 409);
  if (invite.expires_at && invite.expires_at <= now.toISOString()) throw new AppError('INVITE_EXPIRED', 'That invite link has expired', 409);
  const league = await getLeagueById(db, invite.league_id);
  if (!league) throw new AppError('LEAGUE_NOT_FOUND', 'League was not found', 404);
  if (league.status !== 'OPEN') throw new AppError('LEAGUE_CLOSED', 'This league is closed', 409);
  const user = await getUserById(db, userId);
  if (!user || user.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 'Your account cannot join this league', 403);
  if (!user.username) throw new AppError('PROFILE_INVALID', 'Choose a nickname before joining a league', 400);

  const existing = await getMembership(db, league.id, userId);
  if (existing?.active === 1) return existing;
  const timestamp = now.toISOString();
  if (existing) {
    const reactivated = await db.prepare(
      `UPDATE league_players SET active = 1
        WHERE league_id = ? AND user_id = ? AND active = 0
          AND (SELECT COUNT(*) FROM league_players WHERE league_id = ? AND active = 1) < ?`,
    ).bind(league.id, userId, league.id, league.max_players).run();
    if (reactivated.meta.changes !== 1) {
      const current = await getMembership(db, league.id, userId);
      if (current?.active === 1) return current;
      throw leagueFull();
    }
  } else {
    const joined = await db.prepare(
      `INSERT OR IGNORE INTO league_players (league_id, user_id, active, joined_at)
       SELECT ?, ?, 1, ?
        WHERE (SELECT COUNT(*) FROM league_players WHERE league_id = ? AND active = 1) < ?`,
    ).bind(league.id, userId, timestamp, league.id, league.max_players).run();
    if (joined.meta.changes !== 1) {
      const current = await getMembership(db, league.id, userId);
      if (current?.active === 1) return current;
      throw leagueFull();
    }
  }
  await db.prepare('UPDATE league_invites SET uses = uses + 1 WHERE id = ?').bind(invite.id).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'LEAGUE_JOINED', 'LEAGUE_MEMBER', ?, NULL, ?, ?)`,
  ).bind(userId, `${league.id}:${userId}`, JSON.stringify({ leagueId: league.id, inviteId: invite.id }), timestamp).run();
  const member = await getMembership(db, league.id, userId);
  if (!member) throw new Error('League member could not be loaded after joining');
  return member;
}

export async function revokeInvite(db: D1Database, actorUserId: string, inviteId: string, now = new Date()): Promise<void> {
  const invite = await db.prepare(
    `SELECT id, league_id, token_hash, created_by, expires_at, uses, revoked_at, created_at
       FROM league_invites WHERE id = ?`,
  ).bind(inviteId).first<InviteRecord>();
  if (!invite) throw new AppError('INVITE_INVALID', 'Invite was not found', 404);
  if (invite.revoked_at) return;
  const timestamp = now.toISOString();
  await db.prepare('UPDATE league_invites SET revoked_at = ? WHERE id = ?').bind(timestamp, inviteId).run();
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, 'INVITE_REVOKED', 'LEAGUE_INVITE', ?, ?, ?, ?)`,
  ).bind(actorUserId, inviteId, JSON.stringify({ revokedAt: null }), JSON.stringify({ revokedAt: timestamp }), timestamp).run();
}
