import { Hono } from 'hono';
import type { Env } from '../env';
import { AppError, jsonError } from '../errors';
import { validateUsername } from '../domain/username';
import { getUserById, publicUser, setUsernameAndJoinLeague, upsertGoogleUser } from '../db/users';
import { buildGoogleAuthorizationUrl, exchangeGoogleCode, verifyGoogleCredential, type GoogleIdentity } from '../auth/google';
import {
  expiredCookie,
  issueSession,
  oauthStateCookie,
  readCookie,
  revokeSession,
  sessionCookie,
} from '../auth/session';
import { requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';

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

export function createAuthRoutes(dependencies: AuthRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.post('/api/auth/google', requireSameOrigin, async (c) => {
    c.header('Cache-Control', 'no-store');
    if (!c.env.GOOGLE_CLIENT_ID) {
      return jsonError(c, new AppError('CONFIGURATION_ERROR', 'Google sign-in is not configured', 503));
    }
    const body = await c.req.json().catch(() => null) as { credential?: unknown } | null;
    if (!body || typeof body.credential !== 'string' || body.credential.length < 20) {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A Google credential is required', 400));
    }

    let identity: GoogleIdentity;
    try {
      identity = await (dependencies.verifyCredential ?? verifyGoogleCredential)(body.credential, c.env.GOOGLE_CLIENT_ID);
    } catch {
      return jsonError(c, new AppError('UNAUTHENTICATED', 'Google sign-in could not be verified', 401));
    }

    try {
      const user = await upsertGoogleUser(c.env.DB, identity, now(), c.env.BOOTSTRAP_ADMIN_EMAIL, c.env.MASTER_ADMIN_EMAIL);
      const session = await issueSession(c.env.DB, user.id, now());
      c.header('Set-Cookie', sessionCookie(session.token));
      return c.json({
        user: publicUser(user),
        requiresOnboarding: user.username === null,
      }, 200, { 'Cache-Control': 'no-store' });
    } catch {
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
    const expectedState = readCookie(c.req.raw, 'misfits_oauth_state');
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
      const user = await upsertGoogleUser(c.env.DB, identity, now(), c.env.BOOTSTRAP_ADMIN_EMAIL, c.env.MASTER_ADMIN_EMAIL);
      const session = await issueSession(c.env.DB, user.id, now());
      c.header('Set-Cookie', sessionCookie(session.token));
      c.header('Set-Cookie', expiredCookie('misfits_oauth_state'), { append: true });
      return c.redirect(user.username ? '/' : '/onboarding', 302);
    } catch {
      return authFailure(c, 'Account setup could not be completed');
    }
  });

  routes.get('/api/me', requireUser, async (c) => {
    const user = await getUserById(c.env.DB, c.get('user').id);
    if (!user) return jsonError(c, new AppError('UNAUTHENTICATED', 'Sign-in is required', 401));
    return c.json({
      user: publicUser(user),
      requiresOnboarding: user.username === null,
    }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.post('/api/me/username', requireSameOrigin, requireUser, async (c) => {
    const body = await c.req.json().catch(() => null) as { username?: unknown } | null;
    if (!body || typeof body.username !== 'string') {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'A username is required', 400));
    }
    const validation = validateUsername(body.username);
    if (!validation.ok) {
      return jsonError(c, new AppError('VALIDATION_ERROR', `Username is invalid: ${validation.reason}`, 400));
    }

    try {
      const user = await setUsernameAndJoinLeague(c.env.DB, c.get('user').id, validation.value, now());
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
    await revokeSession(c.env.DB, readCookie(c.req.raw, 'misfits_session'));
    c.header('Set-Cookie', expiredCookie('misfits_session'));
    return c.json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
  });

  return routes;
}
