/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const shared = { leagueCalls: 0, publicEnabled: false };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string, public readonly code?: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.reject(new ApiClientError(401, 'Sign-in required')); }
    leagues() { shared.leagueCalls += 1; return Promise.resolve({ leagues: [] }); }
    publicOpenLeague() {
      if (!shared.publicEnabled) return Promise.reject(new ApiClientError(404, 'Public league was not found'));
      return Promise.resolve({ league: { id: 'public-1', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN', maxLegs: 6, targetLegs: 4, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' }, players: [] });
    }
    publicFixtures() {
      return Promise.resolve({ fixtures: [{ round: 1, meetingNumber: 1, status: 'OUTSTANDING', playerAUsername: 'Alpha', playerBUsername: 'Bravo', result: null }] });
    }
  }
  return { state: shared, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class { mountButton() { return Promise.resolve(() => undefined); } } }));

import App from '../../src/client/App';

describe('private signed-out UX', () => {
  beforeEach(() => {
    cleanup();
    state.leagueCalls = 0;
    state.publicEnabled = false;
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows a privacy-safe members-club entry without loading league data', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Welcome to Misfits' })).toBeTruthy();
    expect(screen.getByText('Existing members can sign in with Google. New members need a private club invitation.')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Sign in with Google' })).toBeTruthy();
    expect(screen.getByText(/League tables, results and member details stay private/)).toBeTruthy();
    expect(screen.queryByText('Standings')).toBeNull();
    expect(screen.queryByText('Latest results')).toBeNull();
    await waitFor(() => expect(state.leagueCalls).toBe(0));
  });

  it('keeps an unavailable league-shaped deep link explicit and privacy-safe', async () => {
    window.history.replaceState({}, '', '/league/tuesday-club');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'League unavailable' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Sign in with Google' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Tuesday Club' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share league' })).toBeNull();
    expect(state.leagueCalls).toBe(0);
  });

  it('renders the public fixture board without calling the private member entry', async () => {
    state.publicEnabled = true;
    window.history.replaceState({}, '', '/league/tuesday-club');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Tuesday Club' })).toBeTruthy();
    expect(await screen.findByText('Alpha vs Bravo')).toBeTruthy();
    expect(screen.getByText('Only the club\'s deliberately public fixture schedule is shown here. Private account and member details stay protected.')).toBeTruthy();
    expect(state.leagueCalls).toBe(0);
  });
});
