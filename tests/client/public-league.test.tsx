/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firstLeague = { id: 'league-1', name: 'Tuesday Club', slug: 'tuesday-club', seasonName: '2026', status: 'OPEN' as const, maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0, targetLegs: 4, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' as const };
const secondLeague = { ...firstLeague, id: 'league-2', name: 'Misfits 501', slug: 'misfits-501' };
const standings = [{ rank: 1, playerId: 'player-1', username: 'Wilf', played: 4, won: 2, drawn: 1, lost: 1, legsFor: 12, legsAgainst: 8, legDifference: 4, average: 51.24, points: 7 }];
const results = [{ id: 'result-1', leagueId: 'league-1', playerAId: 'player-1', playerBId: 'player-2', playerAUsername: 'Wilf', playerBUsername: 'Sam', playerALegs: 3, playerBLegs: 3, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-1', status: 'CONFIRMED' as const, confirmedBy: 'player-2', disputeNote: null, createdAt: '2026-08-21T12:00:00.000Z', confirmedAt: '2026-08-21T12:30:00.000Z' }];

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
    results() { return Promise.resolve({ results }); }
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

  it('presents the signed-out view as a mobile league-first club app', async () => {
    render(<App />);
    const leagueHeading = await screen.findByRole('heading', { name: 'Tuesday Club' });
    const standingsTable = screen.getByRole('table', { name: 'Tuesday Club 2026 standings' });
    const signIn = screen.getByRole('group', { name: 'Sign in with Google' });

    expect(screen.queryByRole('heading', { name: 'The club table' })).toBeNull();
    expect(screen.getByText('2026 Season')).toBeTruthy();
    expect(screen.getByText('Best of 6 · Win 3 · Draw 1 · Loss 0')).toBeTruthy();
    expect(screen.getByText('Table: Points → Legs won → Head-to-head')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share league' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Club navigation' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'League' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();

    expect(leagueHeading.compareDocumentPosition(standingsTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(standingsTable.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(await screen.findByRole('rowheader', { name: 'Wilf' })).toBeTruthy();
    expect(document.querySelectorAll('img[src="/brand/misfits-501.jpg"]')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Latest results' })).toBeTruthy();
    expect(screen.getAllByText('Wilf')).toHaveLength(2);
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Draw')).toBeTruthy();
  });

  it('opens a shared public league deep link and copies its link from the public view', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tuesday Club' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Misfits 501' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Share league' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('League link copied.'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/league/tuesday-club');
  });
});
