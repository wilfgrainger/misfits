export interface UserSummary {
  id: string;
  username: string | null;
  role: 'PLAYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
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
}
