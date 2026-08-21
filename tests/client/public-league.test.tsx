/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firstLeague = { id: 'league-1', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const, pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' as const };
const secondLeague = { ...firstLeague, id: 'league-2', name: 'Misfits 501', slug: 'misfits-501' };
const standings = [{ rank: 1, playerId: 'player-1', username: 'Wilf', played: 4, won: 3, lost: 1, legsFor: 10, legsAgainst: 5, legDifference: 5, average: 51.24, points: 6 }];

vi.mock('../../src/client/api', () => {
  class MockApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class MockApiClient {
    me() { return Promise.reject(new MockApiClientError(401, 'Sign-in required')); }
    leagues() { return Promise.resolve({ leagues: [firstLeague, secondLeague] }); }
    publicLeague(id: string) {
      const league = id === firstLeague.id ? firstLeague : secondLeague;
      return Promise.resolve({ league: { ...league, players: [] }, players: [] });
    }
    standings() { return Promise.resolve({ standings }); }
    results() { return Promise.resolve({ results: [] }); }
  }
  return { ApiClient: MockApiClient, ApiClientError: MockApiClientError };
});

vi.mock('../../src/client/auth/GoogleAuth', () => ({
  GoogleAuth: class {
    mountButton() { return Promise.resolve(() => undefined); }
  },
}));

import App from '../../src/client/App';

describe('public league sharing', () => {
  beforeEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/league/tuesday-club');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  afterEach(() => cleanup());

  it('presents the signed-out view as a clear club record instead of a marketing hero', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());

    expect(screen.getByRole('heading', { name: 'The club table' })).toBeTruthy();
    expect(screen.getByText('Standings and confirmed results for the current season.')).toBeTruthy();
    expect(screen.getByText('Sign in to record a result or confirm one.')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Tuesday Club 2026 standings' })).toBeTruthy();
    for (const heading of ['Pos', 'Player', 'P', 'W-L', 'Avg', 'Pts']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeTruthy();
    }
    expect(await screen.findByRole('rowheader', { name: 'Wilf' })).toBeTruthy();
    expect(document.querySelectorAll('img[src="/brand/misfits-501.jpg"]')).toHaveLength(1);
    expect(screen.queryByText('Club darts, properly settled.')).toBeNull();
    expect(screen.getByRole('group', { name: 'Sign in with Google' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Misfits 501 leagues' })).toBeNull();
  });

  it('opens a shared public league deep link and copies its link from the public view', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Misfits 501' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Share season' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('League link copied.'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/league/tuesday-club');
  });
});
