import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env';
import { AppError, jsonError } from '../errors';
import { readSessionToken, resolveSession, type AuthUser } from './session';

export interface AuthVariables {
  user: AuthUser;
}

export type AuthAppEnv = { Bindings: Env; Variables: AuthVariables };

export const requireSameOrigin: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next();
  const origin = c.req.header('Origin');
  if (!origin || origin !== c.env.APP_ORIGIN) {
    return jsonError(c, new AppError('FORBIDDEN', 'Request origin is not allowed', 403));
  }
  return next();
};

export const requireUser: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = await resolveSession(c.env.DB, readSessionToken(c.req.raw));
  if (!user) return jsonError(c, new AppError('UNAUTHENTICATED', 'Sign-in is required', 401));
  c.set('user', user);
  return next();
};

export const requireAdmin: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'ADMIN') {
    return jsonError(c, new AppError('FORBIDDEN', 'Administrator access is required', 403));
  }
  return next();
};

export const requireMasterAdmin: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user || !user.isMasterAdmin) {
    return jsonError(c, new AppError('FORBIDDEN', 'Master administrator access is required', 403));
  }
  return next();
};
