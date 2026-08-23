import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env';
import { AppError, jsonError } from '../errors';
import { resolveRequestSession, type AuthUser } from './session';

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
  const user = await resolveRequestSession(c.env.DB, c.req.raw);
  if (!user) return jsonError(c, new AppError('UNAUTHENTICATED', 'Sign-in is required', 401));
  c.set('user', user);
  return next();
};

export const requireClubMember: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = c.get('user');
  if (user?.clubStatus === 'PENDING') {
    return jsonError(c, new AppError('MEMBERSHIP_PENDING', 'Club approval is still pending', 403));
  }
  if (user?.clubStatus === 'REJECTED') {
    return jsonError(c, new AppError('MEMBERSHIP_REJECTED', 'Club membership was not approved', 403));
  }
  if (!user || user.clubStatus !== 'APPROVED') {
    return jsonError(c, new AppError('FORBIDDEN', 'Club membership is required', 403));
  }
  return next();
};

export const requireNamedUser: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user?.username) return jsonError(c, new AppError('PROFILE_INVALID', 'Choose a nickname before continuing', 400));
  return next();
};

export const requireAdmin: MiddlewareHandler<AuthAppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user || user.clubStatus !== 'APPROVED' || user.role !== 'ADMIN') {
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
