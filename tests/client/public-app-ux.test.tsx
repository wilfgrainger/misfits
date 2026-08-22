/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const league = {
    id: 'league-1', name: 'Premier', slug: 'premier', seasonName: '2026', status: 'OPEN' as const,
    maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0, targetLegs: 3,
    maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' as const,
  };
  const shared = { failLeagueList: false, emptyLeagueList: false, leagueCalls: 0 };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.reject(new ApiClientError(401, 'Sign-in required')); }
    leagues() {
      shared.leagueCalls += 1;
      if (shared.failLeagueList) return Promise.reject(new Error('network down'));
      return Promise.resolve({ leagues: shared.emptyLeagueList ? [] : [league] });
    }
    publicLeague() { return Promise.resolve({ league, players: [] }); }
    standings() { return Promise.resolve({ standings: [] }); }
    results() { return Promise.resolve({ results: [] }); }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class { mountButton() { return Promise.resolve(() => undefined); } } }));

import App from '../../src/client/App';

describe('public UX compression', () => {
  beforeEach(() => {
    cleanup();
    state.failLeagueList = false;
    state.emptyLeagueList = false;
    state.leagueCalls = 0;
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows a public load failure separately from an empty competition and retries in place', async () => {
    state.failLeagueList = true;
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The club table could not be loaded.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.queryByText('No public leagues are published yet.')).toBeNull();

    state.failLeagueList = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByRole('heading', { name: 'Premier' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(state.leagueCalls).toBeGreaterThanOrEqual(2);
  });

  it('renders an explicit genuine-empty state without presenting a retry error', async () => {
    state.emptyLeagueList = true;
    render(<App />);

    await waitFor(() => expect(screen.getByText('No public leagues are published yet.')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('labels the league-specific share action as Share league', async () => {
    render(<App />);

    await screen.findByRole('heading', { name: 'Premier' });
    expect(screen.getByRole('button', { name: 'Share league' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Share season' })).toBeNull();
  });
});
