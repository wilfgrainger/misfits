/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const createdLeague = {
    id: 'league-created', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const,
    pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
  };
  const secondLeague = {
    id: 'league-second', name: 'Thursday Club', slug: 'thursday-club', seasonName: '2026', status: 'OPEN' as const,
    pointsPerWin: 2, targetLegs: 5, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
  };
  const shared = {
    user: { id: 'player-a', username: 'Alpha', role: 'PLAYER' as const, status: 'ACTIVE' as const, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false },
    myLeagues: [] as typeof createdLeague[],
    adminLeagues: [] as typeof createdLeague[],
    multipleLeagues: false,
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.resolve({ user: shared.user, requiresOnboarding: false }); }
    leagues() { return Promise.resolve({ leagues: [] }); }
    myLeagues() { return Promise.resolve({ leagues: shared.multipleLeagues ? [createdLeague, secondLeague] : shared.myLeagues }); }
    adminLeagues() { return Promise.resolve({ leagues: shared.multipleLeagues ? [createdLeague, secondLeague] : shared.adminLeagues }); }
    adminPlayers() { return Promise.resolve({ players: [] }); }
    adminMembers() { return Promise.resolve({ members: [] }); }
    adminInvites() { return Promise.resolve({ invites: [] }); }
    adminResults() { return Promise.resolve({ results: [] }); }
    createAdminLeague() {
      shared.myLeagues = [createdLeague];
      shared.adminLeagues = [createdLeague];
      return Promise.resolve({ league: createdLeague });
    }
    updateAdminLeague() {
      const updatedLeague = { ...createdLeague, status: 'CLOSED' as const };
      shared.myLeagues = [updatedLeague];
      shared.adminLeagues = [updatedLeague];
      return Promise.resolve({ league: updatedLeague });
    }
    standings() { return Promise.resolve({ standings: [] }); }
    results() { return Promise.resolve({ results: [] }); }
    publicLeague() { return Promise.resolve({ league: createdLeague, players: [{ id: shared.user.id, username: 'Alpha', profileImageUrl: null }] }); }
    myResults() { return Promise.resolve({ results: [] }); }
    updateProfile() { return Promise.resolve({ profile: shared.user }); }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

describe('integrated league creation', () => {
  beforeEach(() => {
    cleanup();
    state.myLeagues = [];
    state.adminLeagues = [];
    state.multipleLeagues = false;
  });

  it('moves a new owner directly into the created league workspace', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create league' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('League name'), { target: { value: 'Tuesday Club' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create league' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());
    expect(screen.queryByText('Join with an invite link.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Table' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('League state'), { target: { value: 'CLOSED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(screen.getByText('League settings saved.')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));
    expect(screen.getByRole('button', { name: 'League closed' })).toBeTruthy();
  });

  it('keeps the player workspace on the league selected in the league desk', async () => {
    state.multipleLeagues = true;
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());

    const adminRegion = screen.getByRole('region', { name: 'League desk' });
    await waitFor(() => expect(within(adminRegion).getByRole('button', { name: /Thursday Club/ })).toBeTruthy());
    fireEvent.click(within(adminRegion).getByRole('button', { name: /Thursday Club/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Thursday Club' })).toBeTruthy());
    expect(screen.getByLabelText('Thursday Club table')).toBeTruthy();
  });
});
