import { getCookie, setCookie } from 'hono/cookie';
import { Hono } from 'hono';
import type { Env } from '../env';
import { errorPayload } from '../errors';
import { requireSameOrigin, requireUser, type AppVariables } from '../auth/guards';
import { clearSessionCookie, issueSession, revokeSession, SESSION_COOKIE, sessionCookie } from '../auth/session';
import { createGoogleClient, type GoogleClient } from '../auth/google';
import { countAdmins, getUserById, setUserRole, setUsernameAndJoinLeague, upsertGoogleUser } from '../db/users';
import { validateUsername } from '../domain/username';

const OAUTH_STATE_COOKIE = 'misfits_oauth_state';

type AppEnv = { Bindings: Env; Variables: AppVariables };

export interface AuthRouteDeps {
  googleClient?: GoogleClient;
  stateFactory?: () => string;
}

function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function clientFor(env: Env, deps: AuthRouteDeps): GoogleClient {
  return deps.googleClient ?? createGoogleClient(env);
}

function isUsernameConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('unique') && message.toLowerCase().includes('username');
}

export function createAuthRoutes(deps: AuthRouteDeps = {}) {
  const routes = new Hono<AppEnv>();

  routes.get('/auth/google', (c) => {
    const state = deps.stateFactory?.() ?? randomState();
    setCookie(c, OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/auth/google/callback',
      maxAge: 600,
    });
    c.header('Cache-Control', 'private, no-store');
    return c.redirect(clientFor(c.env, deps).buildAuthorizationUrl(state), 302);
  });

  routes.get('/auth/google/callback', async (c) => {
    c.header('Cache-Control', 'private, no-store');
    const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
    const state = c.req.query('state');
    const code = c.req.query('code');
    if (!expectedState || !state || state !== expectedState || !code) {
      return c.json(errorPayload('VALIDATION_ERROR', 'The sign-in response could not be verified.'), 400);
    }

    let identity;
    try {
      identity = await clientFor(c.env, deps).exchangeCode(code);
    } catch {
      return c.json(errorPayload('UNAUTHENTICATED', 'Google sign-in could not be completed.'), 401);
    }
    if (!identity.emailVerified) {
      return c.json(errorPayload('FORBIDDEN', 'A verified Google email address is required.'), 403);
    }

    let user = await upsertGoogleUser(c.env.DB, identity);
    if (
      c.env.BOOTSTRAP_ADMIN_EMAIL
      && c.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase() === identity.email.toLowerCase()
      && await countAdmins(c.env.DB) === 0
    ) {
      await setUserRole(c.env.DB, user.id, 'ADMIN');
      user = { ...user, role: 'ADMIN' };
    }

    const issued = await issueSession(c.env.DB, user.id);
    c.header('Set-Cookie', sessionCookie(issued.token), { append: true });
    setCookie(c, OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/auth/google/callback',
      maxAge: 0,
    });
    return c.redirect(user.username ? '/me' : '/onboarding', 302);
  });

  routes.post('/auth/logout', requireSameOrigin, async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await revokeSession(c.env.DB, token);
    c.header('Set-Cookie', clearSessionCookie());
    c.header('Cache-Control', 'private, no-store');
    return c.body(null, 204);
  });

  routes.get('/api/me', requireUser, (c) => {
    c.header('Cache-Control', 'private, no-store');
    const user = c.get('user');
    return c.json({ user, requiresOnboarding: user.username === null });
  });

  routes.post('/api/me/username', requireSameOrigin, requireUser, async (c) => {
    c.header('Cache-Control', 'private, no-store');
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(errorPayload('VALIDATION_ERROR', 'Enter a valid username.'), 400);
    }
    const input = typeof body === 'object' && body !== null && 'username' in body
      ? String((body as { username: unknown }).username)
      : '';
    const validation = validateUsername(input);
    if (!validation.ok) {
      return c.json(errorPayload('VALIDATION_ERROR', 'Username must be 3-24 characters using letters, numbers, spaces, _ or -.'), 400);
    }
    const user = c.get('user');
    try {
      await setUsernameAndJoinLeague(c.env.DB, user.id, validation.value);
    } catch (error) {
      if (isUsernameConflict(error)) {
        return c.json(errorPayload('USERNAME_UNAVAILABLE', 'That username is already taken.'), 409);
      }
      throw error;
    }
    const updated = await getUserById(c.env.DB, user.id);
    if (!updated) return c.json(errorPayload('UNAUTHENTICATED', 'Account could not be loaded.'), 401);
    return c.json({
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
        status: updated.status,
      },
      requiresOnboarding: false,
    });
  });

  return routes;
}
