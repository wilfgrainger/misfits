import { Hono } from 'hono';
import type { Env } from '../env';
import { AppError, jsonError } from '../errors';
import { validateUsername } from '../domain/username';
import { createPendingInvitedUser, getUserByGoogleSub, getUserById, publicUser, refreshGoogleUser, setUsername, upsertGoogleUser, type UserRecord } from '../db/users';
import { consumeClubInvite, validateClubInvite } from '../db/club-invites';
import { buildGoogleAuthorizationUrl, exchangeGoogleCode, verifyGoogleCredential, type GoogleIdentity } from '../auth/google';
import {
  expiredCookie,
  issueSession,
  LEGACY_OAUTH_STATE_COOKIE,
  LEGACY_SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  oauthStateCookie,
  readOAuthState,
  readSessionTokens,
  revokeSession,
  sessionCookie,
  SESSION_COOKIE,
} from '../auth/session';
import { requireClubMember, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';

interface AuthRouteDependencies {
  exchange?: (config: Parameters<typeof exchangeGoogleCode>[0], code: string) => Promise<GoogleIdentity>;
  verifyCredential?: (credential: string, clientId: string) => Promise<GoogleIdentity>;
  now?: () => Date;
  state?: () => string;
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function authFailure(c: Parameters<typeof jsonError>[0], message = 'Authentication could not be completed') {
  return jsonError(c, new AppError('VALIDATION_ERROR', message, 400));
}

function normalizedEmail(value?: string): string | null {
  const email = value?.trim().toLowerCase();
  return email || null;
}

function isConfiguredAdminIdentity(identity: GoogleIdentity, env: Env): boolean {
  const email = identity.email.trim().toLowerCase();
  return email === normalizedEmail(env.MASTER_ADMIN_EMAIL) || email === normalizedEmail(env.BOOTSTRAP_ADMIN_EMAIL);
}

async function existingOrConfiguredUser(
  env: Env,
  identity: GoogleIdentity,
  at: Date,
): Promise<UserRecord | null> {
  const existing = await getUserByGoogleSub(env.DB, identity.sub);
  if (existing) {
    return refreshGoogleUser(env.DB, existing, identity, at, env.BOOTSTRAP_ADMIN_EMAIL, env.MASTER_ADMIN_EMAIL);
  }
  if (!isConfiguredAdminIdentity(identity, env)) return null;
  return upsertGoogleUser(env.DB, identity, at, env.BOOTSTRAP_ADMIN_EMAIL, env.MASTER_ADMIN_EMAIL);
}

function ensureActive(user: UserRecord): void {
  if (user.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 'This account is suspended', 403);
}

function authPayload(user: UserRecord) {
  return {
    user: publicUser(user),
    requiresOnboarding: user.club_status === 'APPROVED' && user.username === null,
  };
}

export function createAuthRoutes(dependencies: AuthRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.post('/api/auth/google', requireSameOrigin, async (c) => {
    c.header('Cache-Control', 'no-store');
    if (!c.env.GOOGLE_CLIENT_ID) {
      return jsonError(c, new AppError('CONFIGURATION_ERROR', 'Google sign-in is not configured', 503));
    }
    const body = await c.req.json().catch(() => null) as { credential?: unknown; inviteToken?: unknown } | null;
    if (!body || typeof body.credential !== 'string' || body.credential.length < 20) {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A Google credential is required', 400));
    }
    if (body.inviteToken !== undefined && (typeof body.inviteToken !== 'string' || body.inviteToken.length === 0)) {
      return jsonError(c, new AppError('INVITE_INVALID', 'That invitation is not valid', 404));
    }

    let identity: GoogleIdentity;
    try {
      identity = await (dependencies.verifyCredential ?? verifyGoogleCredential)(body.credential, c.env.GOOGLE_CLIENT_ID);
    } catch {
      return jsonError(c, new AppError('UNAUTHENTICATED', 'Google sign-in could not be verified', 401));
    }

    try {
      const at = now();
      let user = await existingOrConfiguredUser(c.env, identity, at);
      if (!user) {
        if (typeof body.inviteToken !== 'string') {
          throw new AppError('INVITE_REQUIRED', 'A Misfits invitation is required', 403);
        }
        const invite = await validateClubInvite(c.env.DB, body.inviteToken, at);
        user = await createPendingInvitedUser(c.env.DB, identity, at);
        await consumeClubInvite(c.env.DB, invite.id);
      }
      ensureActive(user);
      const session = await issueSession(c.env.DB, user.id, at);
      c.header('Set-Cookie', sessionCookie(session.token));
      return c.json(authPayload(user), 200, { 'Cache-Control': 'no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Account setup could not be completed', 400));
    }
  });

  routes.get('/auth/google', (c) => {
    c.header('Cache-Control', 'no-store');
    if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET || !c.env.APP_ORIGIN) {
      return jsonError(c, new AppError('CONFIGURATION_ERROR', 'Google sign-in is not configured', 503));
    }
    const state = dependencies.state?.() ?? randomState();
    const url = buildGoogleAuthorizationUrl({
      clientId: c.env.GOOGLE_CLIENT_ID,
      redirectUri: `${c.env.APP_ORIGIN}/auth/google/callback`,
    }, state);
    c.header('Set-Cookie', oauthStateCookie(state));
    return c.redirect(url, 302);
  });

  routes.get('/auth/google/callback', async (c) => {
    c.header('Cache-Control', 'no-store');
    if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET || !c.env.APP_ORIGIN) {
      return jsonError(c, new AppError('CONFIGURATION_ERROR', 'Google sign-in is not configured', 503));
    }
    const expectedState = readOAuthState(c.req.raw);
    const receivedState = c.req.query('state');
    if (!expectedState || !receivedState || expectedState !== receivedState) {
      return authFailure(c, 'Invalid OAuth state');
    }
    const error = c.req.query('error');
    const code = c.req.query('code');
    if (error || !code) return authFailure(c, 'Google sign-in was cancelled or returned no code');

    let identity: GoogleIdentity;
    try {
      identity = await (dependencies.exchange ?? exchangeGoogleCode)({
        clientId: c.env.GOOGLE_CLIENT_ID,
        clientSecret: c.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${c.env.APP_ORIGIN}/auth/google/callback`,
      }, code);
    } catch {
      return authFailure(c, 'Google sign-in could not be verified');
    }

    try {
      const at = now();
      const user = await existingOrConfiguredUser(c.env, identity, at);
      c.header('Set-Cookie', expiredCookie(OAUTH_STATE_COOKIE));
      c.header('Set-Cookie', expiredCookie(LEGACY_OAUTH_STATE_COOKIE), { append: true });
      if (!user) return c.redirect('/?auth=invite-required', 302);
      ensureActive(user);
      const session = await issueSession(c.env.DB, user.id, at);
      c.header('Set-Cookie', sessionCookie(session.token), { append: true });
      const destination = user.club_status === 'APPROVED' && !user.username ? '/onboarding' : '/';
      return c.redirect(destination, 302);
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return authFailure(c, 'Account setup could not be completed');
    }
  });

  routes.get('/api/me', requireUser, async (c) => {
    const user = await getUserById(c.env.DB, c.get('user').id);
    if (!user) return jsonError(c, new AppError('UNAUTHENTICATED', 'Sign-in is required', 401));
    return c.json(authPayload(user), 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/me/username', requireSameOrigin, requireUser, requireClubMember, async (c) => {
    const body = await c.req.json().catch(() => null) as { username?: unknown } | null;
    if (!body || typeof body.username !== 'string') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A username is required', 400));
    }
    const validation = validateUsername(body.username);
    if (!validation.ok) {
      return jsonError(c, new AppError('VALIDATION_ERROR', `Username is invalid: ${validation.reason}`, 400));
    }

    try {
      const user = await setUsername(c.env.DB, c.get('user').id, validation.value, now());
      return c.json({
        user: publicUser(user),
        requiresOnboarding: false,
      });
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        return jsonError(c, new AppError('USERNAME_UNAVAILABLE', 'That username is already in use', 409));
      }
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Username could not be saved', 400));
    }
  });

  routes.post('/auth/logout', requireSameOrigin, async (c) => {
    for (const token of readSessionTokens(c.req.raw)) await revokeSession(c.env.DB, token);
    c.header('Set-Cookie', expiredCookie(SESSION_COOKIE));
    c.header('Set-Cookie', expiredCookie(LEGACY_SESSION_COOKIE), { append: true });
    return c.json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
  });

  return routes;
}
