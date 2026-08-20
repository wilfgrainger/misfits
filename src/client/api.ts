export interface UserSummary {
  id: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  profileImageUrl: string | null;
  dartsCounterUrl: string | null;
}

export interface AuthPayload {
  user: UserSummary;
  requiresOnboarding: boolean;
}

export interface AdminPlayer extends UserSummary {
  email: string;
  leagueActive: boolean;
}

export interface AdminPlayerChanges {
  role?: UserSummary['role'];
  status?: UserSummary['status'];
}

export interface LeagueSummary {
  id: string;
  name: string;
  slug: string;
  seasonName: string;
  status: 'OPEN' | 'CLOSED';
  pointsPerWin: number;
  targetLegs: number;
  maxPlayers: number;
  matchesPerPair: number;
  createdBy?: string | null;
}

export interface LeaguePlayer {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
}

export interface LeagueDetail extends LeagueSummary {
  players: LeaguePlayer[];
}

export interface StandingRow {
  rank: number;
  playerId: string;
  username: string;
  played: number;
  won: number;
  lost: number;
  legsFor: number;
  legsAgainst: number;
  legDifference: number;
  points: number;
  average: number;
}

export interface ResultSummary {
  id: string;
  leagueId: string;
  playerAId: string;
  playerBId: string;
  playerAUsername: string | null;
  playerBUsername: string | null;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
  submittedBy: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED';
  confirmedBy: string | null;
  disputeNote: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface ProfileUpdate {
  username?: string;
  dartsCounterUrl?: string | null;
}

export interface ResultInput {
  playerAId: string;
  playerBId: string;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
}

export class ApiClientError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class ApiClient {
  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...init, headers, credentials: 'include' });
    const payload = await response.json().catch(() => null) as { error?: { message?: string }; [key: string]: unknown } | null;
    if (!response.ok) throw new ApiClientError(response.status, payload?.error?.message ?? 'Request failed');
    return payload as T;
  }

  me() { return this.call<{ user: UserSummary; requiresOnboarding: boolean }>('/api/me'); }
  signIn(credential: string) { return this.call<AuthPayload>('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }); }
  setUsername(username: string) { return this.call<AuthPayload>('/api/me/username', { method: 'POST', body: JSON.stringify({ username }) }); }
  logout() { return this.call<{ ok: true }>('/auth/logout', { method: 'POST' }); }
  adminPlayers() { return this.call<{ players: AdminPlayer[] }>('/api/admin/players'); }
  updateAdminPlayer(id: string, changes: AdminPlayerChanges) {
    return this.call<{ player: AdminPlayer }>(`/api/admin/players/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  }

  profile() { return this.call<{ profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'> }>('/api/me/profile'); }
  updateProfile(input: ProfileUpdate) { return this.call<{ profile: UserSummary }>('/api/me/profile', { method: 'PATCH', body: JSON.stringify(input) }); }
  leagues() { return this.call<{ leagues: LeagueSummary[] }>('/api/public/leagues'); }
  myLeagues() { return this.call<{ leagues: LeagueSummary[] }>('/api/me/leagues'); }
  publicLeague(key: string) { return this.call<{ league: LeagueSummary; players: LeaguePlayer[] }>(`/api/public/leagues/${encodeURIComponent(key)}`).then((payload) => ({ ...payload, league: { ...payload.league, players: payload.players } as LeagueDetail })); }
  standings(leagueId: string) { return this.call<{ standings: StandingRow[] }>(`/api/public/leagues/${encodeURIComponent(leagueId)}/standings`); }
  results(leagueId: string) { return this.call<{ results: ResultSummary[] }>(`/api/public/leagues/${encodeURIComponent(leagueId)}/results`); }
  myResults() { return this.call<{ results: ResultSummary[] }>('/api/me/results'); }
  joinInvite(token: string) { return this.call<{ membership: { leagueId: string; userId: string; active: boolean } }>(`/api/invites/${encodeURIComponent(token)}/join`, { method: 'POST' }); }
  submitResult(leagueId: string, input: ResultInput) { return this.call<{ result: ResultSummary }>(`/api/leagues/${encodeURIComponent(leagueId)}/results`, { method: 'POST', body: JSON.stringify(input) }); }
  confirmResult(resultId: string) { return this.call<{ result: ResultSummary }>(`/api/results/${encodeURIComponent(resultId)}/confirm`, { method: 'POST' }); }
  disputeResult(resultId: string, note: string) { return this.call<{ result: ResultSummary }>(`/api/results/${encodeURIComponent(resultId)}/dispute`, { method: 'POST', body: JSON.stringify({ note }) }); }
  adminLeagues() { return this.call<{ leagues: LeagueSummary[] }>('/api/admin/leagues'); }
  createAdminLeague(input: Partial<LeagueSummary> & { name: string; seasonName: string; maxPlayers: number }) { return this.call<{ league: LeagueSummary }>('/api/admin/leagues', { method: 'POST', body: JSON.stringify(input) }); }
  updateAdminLeague(id: string, input: Partial<LeagueSummary>) { return this.call<{ league: LeagueSummary }>(`/api/admin/leagues/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }); }
  createInvite(leagueId: string, expiresAt?: string | null) { return this.call<{ invite: { id: string; leagueId: string; expiresAt: string | null; url: string } }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/invites`, { method: 'POST', body: JSON.stringify({ expiresAt: expiresAt ?? null }) }); }
  revokeInvite(inviteId: string) { return this.call<{ ok: true }>(`/api/admin/invites/${encodeURIComponent(inviteId)}/revoke`, { method: 'POST' }); }
  adminMembers(leagueId: string) { return this.call<{ members: Array<{ userId: string; username: string | null; profileImageUrl: string | null; active: boolean; joinedAt: string }> }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/members`); }
  updateMember(leagueId: string, userId: string, active: boolean) { return this.call<{ member: { userId: string; active: boolean } }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/members/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ active }) }); }
  adminResults(leagueId: string) { return this.call<{ results: ResultSummary[] }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/results`); }
  createAdminResult(leagueId: string, input: ResultInput) { return this.call<{ result: ResultSummary }>(`/api/admin/leagues/${encodeURIComponent(leagueId)}/results`, { method: 'POST', body: JSON.stringify(input) }); }
  updateAdminResult(resultId: string, input: ResultInput & { status?: ResultSummary['status']; disputeNote?: string | null }) { return this.call<{ result: ResultSummary }>(`/api/admin/results/${encodeURIComponent(resultId)}`, { method: 'PATCH', body: JSON.stringify(input) }); }
  deleteAdminResult(resultId: string) { return this.call<{ ok: true }>(`/api/admin/results/${encodeURIComponent(resultId)}`, { method: 'DELETE' }); }
}
