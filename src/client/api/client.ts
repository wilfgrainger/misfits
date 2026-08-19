import type { ApiErrorCode, AuthUser, PublicPlayerDto, PublicResultDto } from '../../shared/api';

export interface StandingRowDto {
  userId: string;
  username: string;
  played: number;
  won: number;
  lost: number;
  legsFor: number;
  legsAgainst: number;
  legDifference: number;
  points: number;
}

export interface PublicLeagueResponse {
  league: {
    id: string;
    name: string;
    slug: string;
    seasonName: string;
    status: 'OPEN' | 'CLOSED';
    pointsPerWin: number;
    targetLegs: number;
  };
  standings: StandingRowDto[];
}

export interface MeResponse {
  user: AuthUser;
  requiresOnboarding: boolean;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: { error?: { code?: ApiErrorCode; message?: string } } | null = null;
    try {
      body = await response.json() as typeof body;
    } catch {
      body = null;
    }
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? 'VALIDATION_ERROR',
      body?.error?.message ?? `Request failed (${response.status}).`,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  getPublicLeague: () => request<PublicLeagueResponse>('/api/public/league'),
  getPublicResults: (limit = 50) => request<{ results: PublicResultDto[] }>(`/api/public/results?limit=${limit}`),
  getPublicPlayers: () => request<{ players: PublicPlayerDto[] }>('/api/public/players'),
  getMe: () => request<MeResponse>('/api/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};
