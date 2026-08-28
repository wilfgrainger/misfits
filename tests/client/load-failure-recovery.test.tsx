/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import { PublicLeagueView } from '../../src/client/components/PublicLeagueView';
import { MemberApp } from '../../src/client/components/MemberApp';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const league: LeagueSummary = {
  id: 'league-1', name: 'Premier', slug: 'premier', seasonName: '2026', status: 'OPEN',
  maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0, targetLegs: 4,
  maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC',
};
const player: UserSummary = {
  id: 'player-a', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
};

/**
 * DESIGN.md requires deliberate failure behaviour on every data-bearing member
 * surface, with a contextual retry. Without one, a single failed read leaves the
 * club stranded on an announced error and a full page reload as the only way out.
 */
describe('load failure recovery', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('lets a visitor retry a failed public fixture board', async () => {
    let attempt = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attempt += 1;
      if (attempt === 1) return new Response(JSON.stringify({ error: { message: 'Fixtures are unavailable' } }), { status: 500 });
      return new Response(JSON.stringify({ fixtures: [{ round: 1, meetingNumber: 1, status: 'OUTSTANDING', playerAUsername: 'Alpha', playerBUsername: 'Bravo', result: null }] }), { status: 200 });
    });

    render(<PublicLeagueView league={league} leagueKey="premier" />);

    const retry = await screen.findByRole('button', { name: 'Try loading fixtures again' });
    expect(screen.getByRole('alert').textContent).toContain('Fixtures are unavailable');

    fireEvent.click(retry);

    expect(await screen.findByText('Alpha vs Bravo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try loading fixtures again' })).toBeNull();
    expect(attempt).toBe(2);
  });

  it('lets a member retry a failed competition load', async () => {
    let failing = true;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (failing) return new Response(JSON.stringify({ error: { message: 'The club table could not be reached' } }), { status: 503 });
      if (path.endsWith(`/api/public/leagues/${league.id}/standings`)) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith(`/api/public/leagues/${league.id}/results`)) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith(`/api/public/leagues/${league.id}`)) return new Response(JSON.stringify({ league, players: [] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/fixtures')) return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
      if (path.includes('/movement')) return new Response(JSON.stringify({ seasonId: 's1', state: 'PROVISIONAL', provisional: true, unresolvedCount: 0, movement: null, ambiguity: null }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={player} league={league} isParticipant onUserSaved={vi.fn()} onSignOut={vi.fn()} />);

    const retry = await screen.findByRole('button', { name: 'Try loading this competition again' });
    expect(screen.getByRole('alert').textContent).toContain('The club table could not be reached');

    failing = false;
    fireEvent.click(retry);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Try loading this competition again' })).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Standings' })).toBeTruthy();
  });

  it('lets a member retry a failed club players list', async () => {
    let failing = true;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith(`/api/public/leagues/${league.id}`)) {
        if (failing) return new Response(JSON.stringify({ error: { message: 'Players are unavailable' } }), { status: 500 });
        return new Response(JSON.stringify({ league, players: [{ id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      }
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      return new Response(JSON.stringify({ seasons: [], movements: [] }), { status: 200 });
    });

    render(<MemberApp user={player} clubLeagues={[league]} myLeagues={[]} onUserSaved={vi.fn()} onSignOut={vi.fn()} profileRequestKey={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'More' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));

    const retry = await screen.findByRole('button', { name: 'Try loading players again' });
    expect(screen.getByRole('alert').textContent).toContain('Players are unavailable');

    failing = false;
    fireEvent.click(retry);

    expect(await screen.findByText('Bravo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try loading players again' })).toBeNull();
  });
});
