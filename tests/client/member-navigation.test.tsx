/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemberApp } from '../../src/client/components/MemberApp';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const league: LeagueSummary = {
  id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN',
  maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0, targetLegs: 4,
  maxPlayers: 16, matchesPerPair: 1, visibility: 'PRIVATE',
};
const player: UserSummary = {
  id: 'player-a', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
};
const admin: UserSummary = { ...player, role: 'ADMIN', isMasterAdmin: true };
const fixture = {
  id: 'fixture-1', seasonId: 'season-1', leagueId: league.id, playerAId: player.id, playerBId: 'player-b',
  pairKey: 'player-a:player-b', round: 1, meetingNumber: 1, status: 'OUTSTANDING',
  createdAt: '2026-08-22T18:00:00.000Z', updatedAt: '2026-08-22T18:00:00.000Z', voidedAt: null,
  playerAUsername: 'Alpha', playerBUsername: 'Bravo', resultId: null,
};

function mockLeagueLoad(withFixture = true) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path.endsWith(`/api/public/leagues/${league.id}/standings`)) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
    if (path.endsWith(`/api/public/leagues/${league.id}/results`)) return new Response(JSON.stringify({ results: [] }), { status: 200 });
    if (path.endsWith(`/api/public/leagues/${league.id}`)) return new Response(JSON.stringify({ league, players: [{ id: player.id, username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
    if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
    if (path.endsWith(`/api/leagues/${league.id}/fixtures`)) return new Response(JSON.stringify({ fixtures: withFixture ? [fixture] : [] }), { status: 200 });
    if (path.endsWith(`/api/me/leagues/${league.id}/fixtures`)) return new Response(JSON.stringify({ fixtures: withFixture ? [fixture] : [] }), { status: 200 });
    throw new Error(`Unexpected fetch: ${path}`);
  });
}

describe('private member navigation', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('groups the approved member home and Record surfaces as a club record book', async () => {
    mockLeagueLoad(true);
    render(<MemberApp
      user={player}
      clubLeagues={[league]}
      myLeagues={[league]}
      onUserSaved={vi.fn()}
      onSignOut={vi.fn()}
    />);

    expect(screen.getByRole('navigation', { name: 'Member workspace' })).toHaveClass('club-member-nav');
    expect(screen.getByRole('heading', { name: /Good to see you/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your competitions' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Needs you' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your competitions' }).closest('section')).toHaveClass('club-home-primary');
    expect(screen.getByRole('heading', { name: 'Needs you' }).closest('section')).toHaveClass('club-home-attention');

    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    await screen.findByRole('heading', { name: 'Record your result' });
    expect(document.querySelector('.record-competition-workspace')).toHaveClass('competition-record');
  });

  it('keeps the primary navigation fixed to League, Record, Results and More even when fixtures exist', async () => {
    mockLeagueLoad(true);
    render(<PlayerLeague user={player} league={league} isParticipant onUserSaved={vi.fn()} onSignOut={vi.fn()} />);

    const nav = await screen.findByRole('navigation', { name: 'Member workspace' });
    const labels = within(nav).getAllByRole('button').map((button) => button.textContent?.trim());
    expect(labels).toEqual(['League', 'Record', 'Results', 'More']);
    expect(within(nav).queryByRole('button', { name: 'Fixtures' })).toBeNull();
    expect(within(nav).queryByRole('button', { name: 'Players' })).toBeNull();
  });

  it('keeps global destinations club-first and competition views local to the selected league', async () => {
    mockLeagueLoad(false);
    render(<MemberApp
      user={player}
      clubLeagues={[league]}
      myLeagues={[league]}
      onUserSaved={vi.fn()}
      onSignOut={vi.fn()}
    />);

    expect(screen.getAllByRole('button', { name: /^(Home|Record|Leagues|More)$/ })
      .map((button) => button.textContent))
      .toEqual(['Home', 'Record', 'Leagues', 'More']);
    expect(screen.queryByRole('button', { name: 'Fixtures' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Leagues' }));
    fireEvent.click(await screen.findByRole('button', { name: /Misfits 501/i }));
    expect(screen.getByRole('tablist', { name: /Misfits 501 views/i })).toBeTruthy();
  });

  it('puts outstanding fixture selection inside Record rather than a Fixtures destination', async () => {
    mockLeagueLoad(true);
    render(<PlayerLeague user={player} league={league} isParticipant onUserSaved={vi.fn()} onSignOut={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record' }));
    expect(await screen.findByRole('heading', { name: 'Record your result' })).toBeTruthy();
    expect(screen.getByText(/Alpha vs Bravo/)).toBeTruthy();
    expect(screen.getByText(/Round 1/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record this fixture' })).toBeTruthy();
  });

  it('makes Record browse-only for approved members who are not active participants', async () => {
    mockLeagueLoad(true);
    render(<PlayerLeague user={player} league={league} isParticipant={false} onUserSaved={vi.fn()} onSignOut={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record' }));
    expect(await screen.findByRole('heading', { name: 'Record' })).toBeTruthy();
    expect(screen.getByText(/You can browse this league, but you are not currently assigned to it/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send for confirmation' })).toBeNull();
    expect(screen.queryByLabelText('Opponent')).toBeNull();
  });

  it('moves Players, Profile, Admin and Sign out under More, with Admin only for admins', async () => {
    mockLeagueLoad(false);
    const onOpenAdmin = vi.fn();
    const onSignOut = vi.fn();
    render(<PlayerLeague user={admin} league={league} isParticipant onUserSaved={vi.fn()} onOpenAdmin={onOpenAdmin} onSignOut={onSignOut} />);

    fireEvent.click(await screen.findByRole('button', { name: 'More' }));
    const more = screen.getByRole('navigation', { name: 'More player options' });
    expect(within(more).getByRole('button', { name: 'Players' })).toBeTruthy();
    expect(within(more).getByRole('button', { name: 'Profile' })).toBeTruthy();
    fireEvent.click(within(more).getByRole('button', { name: 'Admin' }));
    expect(onOpenAdmin).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'More player options' })).getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
