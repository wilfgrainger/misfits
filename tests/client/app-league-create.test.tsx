/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, createdLeague, secondLeague, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const createdLeague = {
    id: 'league-created', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const,
    maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0, targetLegs: 3,
    maxPlayers: 8, matchesPerPair: 1, visibility: 'PRIVATE' as const, hierarchyPosition: 1, promotionPlaces: 0, relegationPlaces: 0,
  };
  const secondLeague = {
    ...createdLeague,
    id: 'league-second', name: 'Thursday Club', slug: 'thursday-club', hierarchyPosition: 2,
  };
  const shared = {
    user: {
      id: 'player-a', username: 'Alpha', role: 'PLAYER' as 'PLAYER' | 'ADMIN', status: 'ACTIVE' as const,
      clubStatus: 'APPROVED' as const, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
    },
    clubLeagues: [] as typeof createdLeague[],
    myLeagues: [] as typeof createdLeague[],
    adminLeagues: [] as typeof createdLeague[],
    createdLeagueInput: null as Record<string, unknown> | null,
    creationCounter: 0,
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.resolve({ user: shared.user, requiresOnboarding: false }); }
    leagues() { return Promise.resolve({ leagues: shared.clubLeagues }); }
    myLeagues() { return Promise.resolve({ leagues: shared.myLeagues }); }
    adminSeasons() { return Promise.resolve({ seasons: [{ id: 's1', name: '2026', status: 'OPEN', isCurrent: true, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', closedAt: null }] }); }
    adminPlayers() { return Promise.resolve({ players: [] }); }
    seasonLeagues() { return Promise.resolve({ leagues: shared.adminLeagues }); }
    competitionMembers() { return Promise.resolve({ members: [] }); }
    standings() { return Promise.resolve({ standings: [] }); }
    results() { return Promise.resolve({ results: [] }); }
    publicLeague(leagueId: string) {
      const league = shared.clubLeagues.find((item) => item.id === leagueId) ?? createdLeague;
      return Promise.resolve({ league, players: [{ id: shared.user.id, username: 'Alpha', profileImageUrl: null }] });
    }
    myResults() { return Promise.resolve({ results: [] }); }
    fixtures() { return Promise.resolve({ fixtures: [] }); }
    updateProfile() { return Promise.resolve({ profile: shared.user }); }
    createSeasonLeague(_seasonId: string, input: Record<string, unknown>) {
      shared.creationCounter += 1;
      const league = {
        ...createdLeague,
        id: `league-created-${shared.creationCounter}`,
        name: String(input.name || createdLeague.name),
        visibility: (input.visibility as 'PUBLIC' | 'PRIVATE') || 'PRIVATE',
      };
      shared.createdLeagueInput = input;
      shared.adminLeagues = [...shared.adminLeagues, league];
      return Promise.resolve({ league });
    }
    updateCompetitionLeague(leagueId: string) {
      const source = shared.adminLeagues.find((item) => item.id === leagueId) ?? createdLeague;
      const league = { ...source, status: 'CLOSED' as const };
      shared.adminLeagues = shared.adminLeagues.map((item) => item.id === league.id ? league : item);
      return Promise.resolve({ league });
    }
  }
  return { state: shared, createdLeague, secondLeague, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

async function openAdmin() {
  fireEvent.click(await screen.findByRole('button', { name: 'More' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Admin' }));
  await screen.findByRole('region', { name: 'Competition admin' });
}

describe('club administration visibility', () => {
  beforeEach(() => {
    cleanup();
    state.clubLeagues = [];
    state.myLeagues = [];
    state.adminLeagues = [];
    state.createdLeagueInput = null;
    state.creationCounter = 0;
    state.user.role = 'PLAYER';
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('keeps administration inside More and hidden from ordinary players', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: "You're in the club." });

    expect(screen.queryByRole('button', { name: 'Season admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Club table' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(await screen.findByRole('button', { name: 'Profile' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Admin' })).toBeNull();
  });

  it('takes an approved member to their available club league', async () => {
    state.clubLeagues = [createdLeague];
    state.myLeagues = [createdLeague];
    render(<App />);

    await screen.findByRole('heading', { name: 'Tuesday Club' });
    expect(screen.getByRole('button', { name: 'League' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
  });

  it('keeps admin league selection separate from the player workspace', async () => {
    state.user.role = 'ADMIN';
    state.clubLeagues = [createdLeague, secondLeague];
    state.myLeagues = [createdLeague];
    state.adminLeagues = [createdLeague, secondLeague];
    render(<App />);

    await screen.findByRole('heading', { name: 'Tuesday Club' });
    await openAdmin();
    fireEvent.click(screen.getByRole('tab', { name: 'Leagues' }));
    const admin = screen.getByRole('region', { name: 'Competition admin' });
    fireEvent.click(await within(admin).findByRole('button', { name: /Thursday Club/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to club' }));

    expect(await screen.findByRole('heading', { name: 'Tuesday Club' })).toBeTruthy();
  });

  it('does not add an admin-only league to the player workspace after saving', async () => {
    state.user.role = 'ADMIN';
    state.clubLeagues = [createdLeague];
    state.myLeagues = [createdLeague];
    state.adminLeagues = [createdLeague, secondLeague];
    render(<App />);

    await screen.findByRole('heading', { name: 'Tuesday Club' });
    await openAdmin();
    fireEvent.click(screen.getByRole('tab', { name: 'Leagues' }));
    const admin = screen.getByRole('region', { name: 'Competition admin' });
    fireEvent.click(await within(admin).findByRole('button', { name: /Thursday Club/ }));
    fireEvent.click(await within(admin).findByRole('button', { name: 'Save league' }));
    await screen.findByText('League settings saved.');
    fireEvent.click(screen.getByRole('button', { name: 'Back to club' }));

    expect(await screen.findByRole('heading', { name: 'Tuesday Club' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Thursday Club' })).toBeNull();
  });

  it('lets an administrator create the first league from More and keeps PRIVATE as the default', async () => {
    state.user.role = 'ADMIN';
    state.adminLeagues = [];
    render(<App />);

    await screen.findByRole('heading', { name: "You're in the club." });
    await openAdmin();
    fireEvent.click(screen.getByRole('tab', { name: 'Leagues' }));
    const admin = screen.getByRole('region', { name: 'Competition admin' });

    expect((within(admin).getByLabelText('New visibility') as HTMLSelectElement).value).toBe('PRIVATE');
    fireEvent.change(within(admin).getByLabelText('New visibility'), { target: { value: 'PUBLIC' } });
    fireEvent.change(within(admin).getByLabelText('New league name'), { target: { value: 'Friday Club' } });
    fireEvent.click(within(admin).getByRole('button', { name: 'Create league' }));
    await waitFor(() => expect(state.createdLeagueInput).toMatchObject({ name: 'Friday Club', visibility: 'PUBLIC' }));

    expect((within(admin).getByLabelText('New visibility') as HTMLSelectElement).value).toBe('PRIVATE');
  });
});
