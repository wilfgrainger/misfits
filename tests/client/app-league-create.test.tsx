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
    creationCounter: 0,
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.resolve({ user: shared.user, requiresOnboarding: false }); }
    leagues() { return Promise.resolve({ leagues: [] }); }
    myLeagues() { return Promise.resolve({ leagues: shared.multipleLeagues ? [createdLeague, secondLeague] : shared.myLeagues }); }
    adminLeagues() { return Promise.resolve({ leagues: shared.multipleLeagues ? [createdLeague, secondLeague] : shared.adminLeagues }); }
    adminSeasons() { return Promise.resolve({ seasons: [{ id: 's1', name: '2026', status: 'OPEN', isCurrent: true, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', closedAt: null }] }); }
    seasonLeagues() { return Promise.resolve({ leagues: shared.multipleLeagues ? [createdLeague, secondLeague] : shared.adminLeagues }); }
    seasonUnassigned() { return Promise.resolve({ users: [] }); }
    competitionMembers() { return Promise.resolve({ members: [] }); }
    fixtures() { return Promise.resolve({ fixtures: [] }); }
    promotionPreview() { return Promise.resolve({ preview: { seasonId: 's1', provisional: false, unresolvedCount: 0, movements: [], ambiguities: [] } }); }
    adminPlayers() { return Promise.resolve({ players: [] }); }
    adminMembers() { return Promise.resolve({ members: [] }); }
    adminInvites() { return Promise.resolve({ invites: [] }); }
    adminResults() { return Promise.resolve({ results: [] }); }
    createSeasonLeague(_seasonId: string, input: Record<string, unknown>) { return this.createAdminLeague(input); }
    createAdminLeague(input: Record<string, unknown>) {
      shared.creationCounter++;
      const newLeague = {
        ...createdLeague,
        id: `league-created-${shared.creationCounter}`,
        name: (input.name as string) || createdLeague.name,
        seasonName: (input.seasonName as string) || createdLeague.seasonName || '2026',
        maxPlayers: Number(input.maxPlayers) || createdLeague.maxPlayers,
        matchesPerPair: Number(input.matchesPerPair) || createdLeague.matchesPerPair,
        targetLegs: Number(input.targetLegs) || createdLeague.targetLegs,
        pointsPerWin: Number(input.pointsPerWin) || createdLeague.pointsPerWin,
        visibility: (input.visibility as any) || createdLeague.visibility,
      };
      shared.createdLeagueInput = input;
      shared.myLeagues = [newLeague];
      shared.adminLeagues = [newLeague];
      return Promise.resolve({ league: newLeague });
    }
    updateCompetitionLeague(leagueId: string, input: Record<string, unknown>) { return this.updateAdminLeague(leagueId, input); }
    updateAdminLeague(leagueId: string, _input?: Record<string, unknown>) {
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
    state.creationCounter = 0;
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

    await screen.findByRole('heading', { name: 'Tuesday Club' });
    expect(screen.queryByText('Club darts, properly settled.')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy();
  });

  it('keeps the player workspace selection separate from the league desk', async () => {
    state.multipleLeagues = true;
    state.user.role = 'ADMIN';
    render(<App />);
    
    // Switch to player view to verify initial workspace rendering
    fireEvent.click(await screen.findByRole('button', { name: 'Club table' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());

    // Switch to admin view to select Thursday Club
    fireEvent.click(await screen.findByRole('button', { name: 'Season admin' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const leaguesRegion = screen.getByRole('region', { name: 'Competition admin' });
    await waitFor(() => expect(within(leaguesRegion).getByRole('button', { name: /Thursday Club/ })).toBeTruthy());
    fireEvent.click(within(leaguesRegion).getByRole('button', { name: /Thursday Club/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /Thursday Club/ })).toBeTruthy());
    
    // Switch back to player view to check that Tuesday Club standings are still displayed
    fireEvent.click(await screen.findByRole('button', { name: 'Club table' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
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

    // Switch to player view to check initial standings
    fireEvent.click(await screen.findByRole('button', { name: 'Club table' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
    
    // Switch to admin view and change selected league
    fireEvent.click(await screen.findByRole('button', { name: 'Season admin' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const leaguesRegion = screen.getByRole('region', { name: 'Competition admin' });
    await waitFor(() => expect(within(leaguesRegion).getByRole('button', { name: /Thursday Club/ })).toBeTruthy());
    fireEvent.click(within(leaguesRegion).getByRole('button', { name: /Thursday Club/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /Thursday Club/ })).toBeTruthy());
    
    // Switch back to player view to verify standings did not change
    fireEvent.click(await screen.findByRole('button', { name: 'Club table' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
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

    // Switch to player view to verify initial standings
    fireEvent.click(await screen.findByRole('button', { name: 'Club table' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
    
    // Switch to admin view to select and save Thursday Club
    fireEvent.click(await screen.findByRole('button', { name: 'Season admin' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const leaguesRegion = screen.getByRole('region', { name: 'Competition admin' });
    await waitFor(() => expect(within(leaguesRegion).getByRole('button', { name: /Thursday Club/ })).toBeTruthy());
    fireEvent.click(within(leaguesRegion).getByRole('button', { name: /Thursday Club/ }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Thursday Club/ })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save league' }));

    await waitFor(() => expect(screen.getByText('League settings saved.')).toBeTruthy());
    
    // Switch to player view to confirm Thursday Club was not added
    fireEvent.click(screen.getByRole('button', { name: 'Club table' }));
    await waitFor(() => expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy());
    expect(screen.queryByRole('table', { name: 'Thursday Club 2026 standings' })).toBeNull();
  });

  it('submits new league creation private by default', async () => {
    state.user.role = 'ADMIN';
    render(<App />);

    const adminTabButton = await screen.findByRole('button', { name: 'Season admin' });
    fireEvent.click(adminTabButton);

    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const createForm = screen.getByRole('region', { name: 'Competition admin' });

    expect((within(createForm).getByLabelText('New visibility') as HTMLSelectElement).value).toBe('PRIVATE');
    fireEvent.change(within(createForm).getByLabelText('New visibility'), { target: { value: 'PUBLIC' } });
    fireEvent.change(within(createForm).getByLabelText('New league name'), { target: { value: 'Friday Club' } });
    fireEvent.click(within(createForm).getByRole('button', { name: 'Create league' }));

    await waitFor(() => expect(state.createdLeagueInput).toMatchObject({ name: 'Friday Club', visibility: 'PUBLIC' }));
    expect((within(createForm).getByLabelText('New visibility') as HTMLSelectElement).value).toBe('PRIVATE');
    fireEvent.change(within(createForm).getByLabelText('New league name'), { target: { value: 'Saturday Club' } });
    fireEvent.click(within(createForm).getByRole('button', { name: 'Create league' }));
    await waitFor(() => expect(state.createdLeagueInput).toMatchObject({ name: 'Saturday Club', visibility: 'PRIVATE' }));
  });
});
