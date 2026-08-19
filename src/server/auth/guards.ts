import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AuthUser } from '../../shared/api';
import type { Env } from '../env';
import { errorPayload } from '../errors';
import { resolveSession, SESSION_COOKIE } from './session';

export interface AppVariables {
  user: AuthUser;
}

type AppEnv = { Bindings: Env; Variables: AppVariables };

export const requireSameOrigin = createMiddleware<AppEnv>(async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method.toUpperCase())) return next();
  const origin = c.req.header('Origin');
  let allowed = false;
  if (origin) {
    try {
      allowed = new URL(origin).origin === new URL(c.env.APP_ORIGIN).origin;
    } catch {
      allowed = false;
    }
  }
  if (!allowed) return c.json(errorPayload('FORBIDDEN', 'This request is not allowed.'), 403);
  return next();
});

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json(errorPayload('UNAUTHENTICATED', 'Sign in is required.'), 401);
  const user = await resolveSession(c.env.DB, token);
  if (!user) return c.json(errorPayload('SESSION_EXPIRED', 'Your session has expired. Please sign in again.'), 401);
  c.set('user', user);
  return next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json(errorPayload('UNAUTHENTICATED', 'Sign in is required.'), 401);
  if (user.role !== 'ADMIN') return c.json(errorPayload('FORBIDDEN', 'Administrator access is required.'), 403);
  return next();
});
