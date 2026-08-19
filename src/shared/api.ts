export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'USERNAME_UNAVAILABLE'
  | 'INVALID_RESULT'
  | 'OPPONENT_UNAVAILABLE'
  | 'RESULT_ALREADY_RESOLVED'
  | 'LEAGUE_CLOSED'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND';

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
}
