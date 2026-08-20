import type { Context } from 'hono';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'USERNAME_UNAVAILABLE'
  | 'INVALID_RESULT'
  | 'OPPONENT_UNAVAILABLE'
  | 'RESULT_ALREADY_RESOLVED'
  | 'LEAGUE_CLOSED'
  | 'LAST_ADMIN_PROTECTED'
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
  return c.json({ error: { code: error.code, message: error.message } }, error.status as never);
}
