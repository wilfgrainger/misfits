import type { Context } from 'hono';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_SUSPENDED'
  | 'FORBIDDEN'
  | 'USERNAME_UNAVAILABLE'
  | 'INVALID_RESULT'
  | 'OPPONENT_UNAVAILABLE'
  | 'RESULT_ALREADY_RESOLVED'
  | 'LEAGUE_CLOSED'
  | 'LEAGUE_NOT_FOUND'
  | 'LEAGUE_FULL'
  | 'INVITE_REQUIRED'
  | 'INVITE_INVALID'
  | 'INVITE_REVOKED'
  | 'INVITE_EXPIRED'
  | 'MEMBERSHIP_PENDING'
  | 'MEMBERSHIP_REJECTED'
  | 'PAIR_LIMIT_REACHED'
  | 'PROFILE_INVALID'
  | 'LAST_ADMIN_PROTECTED'
  | 'MASTER_ADMIN_PROTECTED'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function jsonError(c: Context, error: AppError): Response {
  return c.json({ error: { code: error.code, message: error.message } }, error.status as never, { 'Cache-Control': 'no-store' });
}
