/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const existingLeague = { id: 'existing-league', name: 'Existing League', slug: 'existing-league', seasonName: '2026', status: 'OPEN' as const, pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const };
  const joinedLeague = { id: 'league-1', name: 'Joined League', slug: 'joined-league', seasonName: '2026', status: 'OPEN' as const, pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PRIVATE' as const };
  const shared = {
    requiresOnboarding: true,
    joined: [] as string[],
    myLeagues: [] as Array<typeof existingLeague>,
    existingLeague,
    joinedLeague,
    user: { id: 'user-1', username: null as string | null, role: 'PLAYER' as const, status: 'ACTIVE' as const, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false },
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.resolve({ user: shared.user, requiresOnboarding: shared.requiresOnboarding }); }
    leagues() { return Promise.resolve({ leagues: [] }); }
    myLeagues() { return Promise.resolve({ leagues: shared.myLeagues }); }
    adminLeagues() { return Promise.resolve({ leagues: [] }); }
    setUsername(username: string) {
      shared.requiresOnboarding = false;
      shared.user = { ...shared.user, username };
      return Promise.resolve({ user: shared.user, requiresOnboarding: false });
    }
    joinInvite(token: string) {
      shared.joined.push(token);
      shared.myLeagues = [shared.existingLeague, shared.joinedLeague];
      return Promise.resolve({ membership: { leagueId: 'league-1', userId: shared.user.id, active: true } });
    }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

describe('invite onboarding', () => {
  beforeEach(() => {
    cleanup();
    state.requiresOnboarding = true;
    state.joined.length = 0;
    state.myLeagues = [];
    state.user = { ...state.user, username: null };
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/join/season-token');
  });

  it('keeps an invite through nickname setup and joins after Google authentication', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByLabelText('Nickname')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'New Player' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(state.joined).toEqual(['season-token']));
    expect(screen.getByText('You joined the league.')).toBeTruthy();
  });

  it('selects the league that was just joined when another membership already exists', async () => {
    state.requiresOnboarding = false;
    state.user = { ...state.user, username: 'Existing Player' };
    state.myLeagues = [state.existingLeague];
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Joined League/ })).toBeTruthy());
    expect(screen.getByRole('button', { name: /Joined League/ }).getAttribute('aria-current')).toBe('page');
  });
});
