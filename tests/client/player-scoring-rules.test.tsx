/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const user: UserSummary = {
  id: 'u1',
  username: 'Alpha',
  role: 'PLAYER',
  status: 'ACTIVE',
  profileImageUrl: null,
  dartsCounterUrl: null,
  isMasterAdmin: false,
};

const league: LeagueSummary = {
  id: 'l1',
  name: 'Premier',
  slug: 'premier',
  seasonName: '2026/27',
  status: 'OPEN',
  maxLegs: 6,
  pointsPerWin: 3,
  pointsPerDraw: 1,
  pointsPerLoss: 0,
  targetLegs: 4,
  maxPlayers: 8,
  matchesPerPair: 1,
  visibility: 'PUBLIC',
};

const standings = [
  { rank: 1, playerId: 'u1', username: 'Alpha', played: 2, won: 1, drawn: 1, lost: 0, legsFor: 7, legsAgainst: 4, legDifference: 3, average: 52.5, points: 4 },
  { rank: 2, playerId: 'u2', username: 'Bravo', played: 2, won: 0, drawn: 1, lost: 1, legsFor: 4, legsAgainst: 7, legDifference: -3, average: 47.5, points: 1 },
];

const drawResult = {
  id: 'r1', leagueId: 'l1', playerAId: 'u1', playerBId: 'u2', playerAUsername: 'Alpha', playerBUsername: 'Bravo',
  playerALegs: 3, playerBLegs: 3, playerAAverage: 51.2, playerBAverage: 48.4, submittedBy: 'u1', status: 'CONFIRMED',
  confirmedBy: 'u2', disputeNote: null, createdAt: '2026-08-21T12:00:00.000Z', confirmedAt: '2026-08-21T12:05:00.000Z',
};

function installApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path === '/api/public/leagues/l1/standings') return new Response(JSON.stringify({ standings }), { status: 200 });
    if (path === '/api/public/leagues/l1/results') return new Response(JSON.stringify({ results: [drawResult] }), { status: 200 });
    if (path === '/api/public/leagues/l1') return new Response(JSON.stringify({ league, players: [
      { id: 'u1', username: 'Alpha', profileImageUrl: null },
      { id: 'u2', username: 'Bravo', profileImageUrl: null },
    ] }), { status: 200 });
    if (path === '/api/me/results') return new Response(JSON.stringify({ results: [] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/fixtures') return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
    throw new Error(`Unexpected fetch ${path}`);
  });
}

describe('player scoring rules', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); installApi(); });

  it('shows the league scoring contract and W-D-L standings using legs won as a visible table statistic', async () => {
    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Premier' })).toBeTruthy());
    await screen.findByRole('rowheader', { name: 'Alpha' });

    expect(screen.getByText('Best of 6 · Win 3 · Draw 1 · Loss 0')).toBeTruthy();
    expect(screen.getByText('Table: Points → Legs won → Head-to-head')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'W-D-L' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Legs' })).toBeTruthy();
    expect(screen.getByText('1-1-0')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('labels a confirmed 3-3 as a draw and explains Best of 6 result entry', async () => {
    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Premier' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Results' }));
    expect(await screen.findByText('Draw')).toBeTruthy();
    expect(screen.queryByText(/Winner:/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));
    expect(screen.getByText('Best of 6: first to 4 wins; 3-3 is a draw.')).toBeTruthy();
    const yourLegs = screen.getByLabelText('Your legs') as HTMLInputElement;
    expect(yourLegs.value).toBe('');
    expect(yourLegs.max).toBe('4');
  });
});
