/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const { MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const league = {
    id: 'league-1', name: 'Premier', slug: 'premier', seasonName: '2026', status: 'OPEN' as const,
    maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0, targetLegs: 3,
    maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' as const,
  };
  const user = {
    id: 'player-a', username: 'Alpha', role: 'PLAYER' as const, status: 'ACTIVE' as const,
    profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() { return Promise.resolve({ user, requiresOnboarding: false }); }
    leagues() { return Promise.resolve({ leagues: [league] }); }
    myLeagues() { return Promise.resolve({ leagues: [league] }); }
    standings() { return Promise.resolve({ standings: [] }); }
    results() { return Promise.resolve({ results: [] }); }
    publicLeague() { return Promise.resolve({ league, players: [{ id: user.id, username: user.username, profileImageUrl: null }] }); }
    myResults() { return Promise.resolve({ results: [] }); }
    fixtures() { return Promise.reject(new ApiClientError(403, 'Forbidden')); }
  }
  return { MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class {} }));

import App from '../../src/client/App';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps meaningful league context in one player hero without repeating account chrome', async () => {
  render(<App />);

  await screen.findByRole('heading', { name: 'Premier' });
  expect(screen.getByText('2026 Season')).toBeTruthy();
  expect(screen.getByText('OPEN')).toBeTruthy();
  expect(screen.queryByText(/Current season:/)).toBeNull();
  expect(screen.queryByText('1 season')).toBeNull();
  expect(document.querySelector('.account-status')).toBeNull();
  expect(document.querySelector('.account-heading')).toBeNull();
});
