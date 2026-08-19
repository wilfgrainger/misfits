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

export interface PlayerResultDto {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED';
  playerAId: string;
  playerAUsername: string;
  playerALegs: number;
  playerBId: string;
  playerBUsername: string;
  playerBLegs: number;
  submittedBy: string;
  confirmedBy: string | null;
  disputeNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  canRespond?: boolean;
}

export interface AdminLeagueDto {
  id: string;
  name: string;
  season_name: string;
  status: 'OPEN' | 'CLOSED';
  points_per_win: number;
  target_legs: number;
}

export interface AdminPlayerDto {
  id: string;
  email: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  leagueActive: boolean;
  joinedAt: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuditRecordDto {
  id: number;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown | null;
  after: unknown | null;
  createdAt: string;
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
  setUsername: (username: string) => request<MeResponse>('/api/me/username', { method: 'POST', body: JSON.stringify({ username }) }),
  getOpponents: () => request<{ opponents: PublicPlayerDto[] }>('/api/me/opponents'),
  getMyResults: () => request<{ results: PlayerResultDto[] }>('/api/me/results'),
  submitResult: (body: { opponentId: string; myLegs: number; opponentLegs: number }) => request<{ result: PlayerResultDto }>('/api/results', { method: 'POST', body: JSON.stringify(body) }),
  confirmResult: (id: string) => request<{ result: PlayerResultDto }>(`/api/results/${encodeURIComponent(id)}/confirm`, { method: 'POST' }),
  disputeResult: (id: string, note?: string) => request<{ result: PlayerResultDto }>(`/api/results/${encodeURIComponent(id)}/dispute`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) }),
  getAdminSummary: () => request<{ league: AdminLeagueDto; counts: { players: number; results: number; pending: number; disputed: number; confirmed: number } }>('/api/admin/summary'),
  getAdminPlayers: () => request<{ players: AdminPlayerDto[] }>('/api/admin/players'),
  updateAdminPlayer: (id: string, patch: Partial<Pick<AdminPlayerDto, 'username' | 'role' | 'status' | 'leagueActive'>>) => request<{ player: AdminPlayerDto }>(`/api/admin/players/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  getAdminResults: () => request<{ results: PlayerResultDto[] }>('/api/admin/results'),
  createAdminResult: (body: { playerAId: string; playerBId: string; playerALegs: number; playerBLegs: number }) => request<{ result: PlayerResultDto }>('/api/admin/results', { method: 'POST', body: JSON.stringify(body) }),
  updateAdminResult: (id: string, patch: { playerALegs?: number; playerBLegs?: number; status?: 'CONFIRMED' | 'DISPUTED'; disputeNote?: string | null }) => request<{ result: PlayerResultDto }>(`/api/admin/results/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteAdminResult: (id: string) => request<void>(`/api/admin/results/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateAdminLeague: (patch: { seasonName?: string; status?: 'OPEN' | 'CLOSED'; pointsPerWin?: number; targetLegs?: number }) => request<{ league: AdminLeagueDto }>('/api/admin/league', { method: 'PATCH', body: JSON.stringify(patch) }),
  getAdminAudit: (limit = 100) => request<{ audit: AuditRecordDto[] }>(`/api/admin/audit?limit=${limit}`),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};
