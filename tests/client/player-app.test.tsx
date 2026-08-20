/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import { AdminLeagueDesk } from '../../src/client/components/AdminLeagueDesk';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const league: LeagueSummary = { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1 };
const user: UserSummary = { id: 'player-a', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null };

describe('mobile league workspaces', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders a signed-in player table, result navigation and profile entry', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ standings: [{ rank: 1, playerId: 'player-a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 51.24 }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add result' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy();
  });

  it('renders the admin league creation and invite workspace', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/admin/leagues')) return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
      if (path.endsWith('/api/admin/players')) return new Response(JSON.stringify({ players: [] }), { status: 200 });
      if (path.endsWith('/invites') && init?.method !== 'POST') return new Response(JSON.stringify({ invites: [{ id: 'invite-1', leagueId: 'league-1', expiresAt: null, uses: 0, revokedAt: null, createdAt: '2026-08-20T12:00:00.000Z' }] }), { status: 200 });
      if (path.endsWith('/members')) return new Response(JSON.stringify({ members: [
        { userId: 'player-a', username: 'Alpha', profileImageUrl: null, active: true, joinedAt: '2026-08-20T12:00:00.000Z' },
        { userId: 'player-b', username: 'Bravo', profileImageUrl: null, active: true, joinedAt: '2026-08-20T12:00:00.000Z' },
      ] }), { status: 200 });
      if (path.endsWith('/results')) return new Response(JSON.stringify({ results: [{ id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null }] }), { status: 200 });
      if (path.includes('/api/admin/results/')) return new Response(JSON.stringify({ result: { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } }), { status: 200 });
      if (path.includes('/api/admin/invites/')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (path.includes('/invites')) return new Response(JSON.stringify({ invite: { id: 'invite-2', leagueId: 'league-1', expiresAt: null, url: 'https://misfits.test/join/token' } }), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });
    const admin = { ...user, id: 'admin-1', username: 'Admin', role: 'ADMIN' as const };
    render(<AdminLeagueDesk user={admin} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin desk' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Create league' })).toBeTruthy();
    expect(screen.getByLabelText('Target legs')).toBeTruthy();
    expect(screen.getByLabelText('Points per win')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create invite link' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revoke invite' })).toBeTruthy());
    expect(screen.getByRole('heading', { name: 'Enter historical result' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record confirmed result' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit result' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Edit result' }));
    expect(screen.getByRole('button', { name: 'Save result' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save result' }));
    await waitFor(() => expect(screen.getByText('Result updated.')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Invite link copied.'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Revoke invite' }))[0]);
    await waitFor(() => expect(screen.getByText('Invite revoked.')).toBeTruthy());
    expect(confirm).toHaveBeenCalled();
  });
});
