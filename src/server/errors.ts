import type { ApiErrorCode, ApiErrorPayload } from '../shared/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorPayload(code: ApiErrorCode, message: string): ApiErrorPayload {
  return { error: { code, message } };
}
