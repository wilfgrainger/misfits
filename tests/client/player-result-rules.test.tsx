/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LeagueSummary, UserSummary } from '../../src/client/api';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';

const league: LeagueSummary = {
  id: 'league-1',
  name: 'Premier',
  slug: 'premier',
  seasonName: '2026',
  status: 'OPEN',
  maxLegs: 5,
  pointsPerWin: 2,
  pointsPerDraw: 0,
  pointsPerLoss: 0,
  targetLegs: 3,
  maxPlayers: 16,
  matchesPerPair: 1,
  visibility: 'PUBLIC',
};

const user: UserSummary = {
  id: 'player-a',
  username: 'Alpha',
  role: 'PLAYER',
  status: 'ACTIVE',
  profileImageUrl: null,
  dartsCounterUrl: null,
  isMasterAdmin: false,
};

function mockLeagueLoads() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
    if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
    if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [
      { id: 'player-a', username: 'Alpha', profileImageUrl: null },
      { id: 'player-b', username: 'Bravo', profileImageUrl: null },
    ] }), { status: 200 });
    if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
    if (path.includes('/api/admin/competition/leagues/league-1/fixtures')) return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403 });
    throw new Error(`Unexpected fetch: ${path}`);
  });
}

describe('player UX compression', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('uses the scrollable member navigation treatment while keeping every destination reachable', async () => {
    mockLeagueLoads();
    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText('Loading league data...')).toBeNull());
    const nav = screen.getByRole('navigation', { name: 'Member workspace' });
    expect(nav.className).toContain('content-tabs');
    expect(nav.className).not.toContain('segmented-tabs');
    expect(within(nav).getByRole('button', { name: 'Table' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Fixtures' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Results' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Players' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Add result' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Profile' })).toBeTruthy();
  });

  it('starts consequential score fields blank instead of pre-filling a valid win', async () => {
    mockLeagueLoads();
    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);

    await waitFor(() => expect(screen.queryByText('Loading league data...')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));

    expect((screen.getByLabelText('Your legs') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Their legs') as HTMLInputElement).value).toBe('');
  });
});
