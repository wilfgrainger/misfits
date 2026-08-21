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
    user: { id: 'player-a', username: 'Alpha', role: 'PLAYER' as 'PLAYER' | 'ADMIN', status: 'ACTIVE' as const, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false },
    myLeagues: [] as typeof createdLeague[],
    adminLeagues: [] as typeof createdLeague[],
    multipleLeagues: false,
    createdLeagueInput: null as Record<string, unknown> | null,
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
    createAdminLeague(input: Record<string, unknown>) {
      shared.createdLeagueInput = input;
      shared.myLeagues = [createdLeague];
      shared.adminLeagues = [createdLeague];
      return Promise.resolve({ league: createdLeague });
    }
    updateAdminLeague(leagueId: string) {
      const league = leagueId === secondLeague.id ? secondLeague : createdLeague;
      const updatedLeague = { ...league, status: 'CLOSED' as const };
      shared.adminLeagues = shared.adminLeagues.map((item) => item.id === updatedLeague.id ? updatedLeague : item);
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

describe('club administration visibility', () => {
  beforeEach(() => {
    cleanup();
    state.myLeagues = [];
    state.adminLeagues = [];
    state.multipleLeagues = false;
    state.createdLeagueInput = null;
    state.user.role = 'PLAYER';
  });

  it('keeps league administration hidden from ordinary players', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Open your Misfits invite.' })).toBeTruthy());
    expect(screen.queryByRole('region', { name: 'Season admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create league' })).toBeNull();
  });

  it('takes an authenticated club member straight to their current season', async () => {
    state.myLeagues = [{
      id: 'league-created', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const,
      pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
    }];
    render(<App />);

    await screen.findByText('Current season: Tuesday Club · 2026 · Open · Public');
    expect(screen.queryByText('Club darts, properly settled.')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy();
  });

  it('keeps the player workspace selection separate from the league desk', async () => {
    state.multipleLeagues = true;
    state.user.role = 'ADMIN';
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());

    const adminRegion = screen.getByRole('region', { name: 'Season admin' });
    await waitFor(() => expect(within(adminRegion).getByRole('button', { name: /Thursday Club/ })).toBeTruthy());
    fireEvent.click(within(adminRegion).getByRole('button', { name: /Thursday Club/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage Thursday Club' })).toBeTruthy());
    expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy();
    expect(screen.queryByRole('table', { name: 'Thursday Club 2026 standings' })).toBeNull();
  });

  it('keeps admin desk selection separate from player workspace selection', async () => {
    state.user.role = 'ADMIN';
    state.myLeagues = [{
      id: 'league-created', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const,
      pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
    }];
    state.adminLeagues = [
      ...state.myLeagues,
      {
        id: 'league-second', name: 'Thursday Club', slug: 'thursday-club', seasonName: '2026', status: 'OPEN' as const,
        pointsPerWin: 2, targetLegs: 5, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
      },
    ];
    render(<App />);

    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
    fireEvent.click(within(screen.getByRole('region', { name: 'Season admin' })).getByRole('button', { name: /Thursday Club/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage Thursday Club' })).toBeTruthy());
    expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy();
    expect(screen.queryByRole('table', { name: 'Thursday Club 2026 standings' })).toBeNull();
  });

  it('does not add an admin-only league to the player workspace after saving', async () => {
    state.user.role = 'ADMIN';
    state.myLeagues = [{
      id: 'league-created', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const,
      pointsPerWin: 2, targetLegs: 3, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
    }];
    state.adminLeagues = [
      ...state.myLeagues,
      {
        id: 'league-second', name: 'Thursday Club', slug: 'thursday-club', seasonName: '2026', status: 'OPEN' as const,
        pointsPerWin: 2, targetLegs: 5, maxPlayers: 8, matchesPerPair: 1, visibility: 'PUBLIC' as const,
      },
    ];
    render(<App />);

    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
    const adminRegion = screen.getByRole('region', { name: 'Season admin' });
    fireEvent.click(within(adminRegion).getByRole('button', { name: /Thursday Club/ }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manage Thursday Club' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(screen.getByText('League settings saved.')).toBeTruthy());
    expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy();
    expect(screen.queryByRole('table', { name: 'Thursday Club 2026 standings' })).toBeNull();
  });

  it('keeps new season creation in a native closed disclosure and submits private by default', async () => {
    state.user.role = 'ADMIN';
    render(<App />);

    const adminRegion = (await screen.findAllByRole('region')).find((region) => within(region).queryByText(/Create (a new )?season/));
    expect(adminRegion).toBeTruthy();
    const summary = within(adminRegion as HTMLElement).getByText('Create a new season');
    const disclosure = summary.closest('details');
    expect(disclosure).toBeTruthy();
    expect((disclosure as HTMLDetailsElement).open).toBe(false);

    fireEvent.click(summary);
    const createForm = within(disclosure as HTMLDetailsElement);
    expect((createForm.getByLabelText('Visibility') as HTMLSelectElement).value).toBe('PRIVATE');
    fireEvent.change(createForm.getByLabelText('Visibility'), { target: { value: 'PUBLIC' } });
    fireEvent.change(createForm.getByLabelText('Club name'), { target: { value: 'Friday Club' } });
    fireEvent.change(createForm.getByLabelText('Season'), { target: { value: '2027' } });
    fireEvent.change(createForm.getByLabelText('Player capacity'), { target: { value: '8' } });
    fireEvent.change(createForm.getByLabelText('Games per pair'), { target: { value: '1' } });
    fireEvent.change(createForm.getByLabelText('Target legs'), { target: { value: '3' } });
    fireEvent.change(createForm.getByLabelText('Points per win'), { target: { value: '2' } });
    fireEvent.click(createForm.getByRole('button', { name: 'Create season' }));

    await waitFor(() => expect(state.createdLeagueInput).toMatchObject({ name: 'Friday Club', seasonName: '2027', maxPlayers: 8, matchesPerPair: 1, targetLegs: 3, pointsPerWin: 2, visibility: 'PUBLIC' }));
    expect((createForm.getByLabelText('Visibility') as HTMLSelectElement).value).toBe('PRIVATE');
    fireEvent.change(createForm.getByLabelText('Club name'), { target: { value: 'Saturday Club' } });
    fireEvent.click(createForm.getByRole('button', { name: 'Create season' }));
    await waitFor(() => expect(state.createdLeagueInput).toMatchObject({ name: 'Saturday Club', visibility: 'PRIVATE' }));
  });
});
