/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerLeague } from '../../src/client/components/PlayerLeague';
import { AdminLeagueDesk } from '../../src/client/components/AdminLeagueDesk';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const league: LeagueSummary = { id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' };
const user: UserSummary = { id: 'player-a', username: 'Alpha', role: 'PLAYER', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false };

describe('mobile league workspaces', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('renders a signed-in player table, result navigation and profile entry', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ standings: [{ rank: 1, playerId: 'player-a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 51.24 }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
    expect(screen.getByRole('navigation', { name: 'Member workspace' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add result' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy();
  });

  it('submits a player result with both players and averages', async () => {
    const resultPayload = { result: { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5, submittedBy: 'player-a', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/leagues/league-1/results') && init?.method === 'POST') return new Response(JSON.stringify(resultPayload), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));
    await waitFor(() => expect((screen.getByLabelText('Opponent') as HTMLSelectElement).value).toBe('player-b'));
    fireEvent.change(screen.getByLabelText('Your legs'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Their legs'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Your average'), { target: { value: '61.2' } });
    fireEvent.change(screen.getByLabelText('Their average'), { target: { value: '55.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send for confirmation' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Result sent to your opponent.'));
    const resultCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/leagues/league-1/results') && init?.method === 'POST');
    expect(resultCall).toBeTruthy();
    expect(JSON.parse(String(resultCall?.[1]?.body))).toEqual({ playerAId: 'player-a', playerBId: 'player-b', playerALegs: 3, playerBLegs: 1, playerAAverage: 61.2, playerBAverage: 55.5 });
  });

  it('keeps result-dispute focus inside a named dialog and restores its opener', async () => {
    const pendingResult = { id: 'result-1', leagueId: 'league-1', playerAId: 'player-a', playerBId: 'player-b', playerAUsername: 'Alpha', playerBUsername: 'Bravo', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1, submittedBy: 'player-b', status: 'PENDING', confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [pendingResult] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Results' }));
    const dispute = await screen.findByRole('button', { name: 'Dispute' });
    fireEvent.click(dispute);

    expect(screen.getByRole('dialog', { name: 'Dispute result' })).toBeTruthy();
    const note = screen.getByLabelText('What needs checking?');
    expect(document.activeElement).toBe(note);
    fireEvent.keyDown(note, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send dispute' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Send dispute' }), { key: 'Tab' });
    expect(document.activeElement).toBe(note);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(dispute);
  });

  it('saves the signed-in player profile through the profile panel', async () => {
    const onUserSaved = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/public/leagues/league-1/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/public/leagues/league-1')) return new Response(JSON.stringify({ league, players: [{ id: 'player-a', username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/api/me/profile') && init?.method === 'PATCH') return new Response(JSON.stringify({ profile: { ...user, username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha', profileImageUrl: null } }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={league} onUserSaved={onUserSaved} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Alpha Prime' } });
    fireEvent.change(screen.getByLabelText('Darts Counter profile'), { target: { value: 'https://dartcounter.net/alpha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Profile saved.'));
    const profileCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/me/profile') && init?.method === 'PATCH');
    expect(profileCall).toBeTruthy();
    expect(JSON.parse(String(profileCall?.[1]?.body))).toEqual({ username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha' });
    expect(onUserSaved).toHaveBeenCalledWith({ ...user, username: 'Alpha Prime', dartsCounterUrl: 'https://dartcounter.net/alpha', profileImageUrl: null });
  });

  it('renders the admin league creation and invite workspace', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
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
    const admin = { ...user, id: 'admin-1', username: 'Admin', role: 'ADMIN' as const, isMasterAdmin: true };
    render(<AdminLeagueDesk user={admin} selectedLeagueId="league-1" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'League desk' })).toBeTruthy());
    await waitFor(() => expect((screen.getAllByLabelText('Season name')[1] as HTMLInputElement).value).toBe('Misfits 501'));
    expect(screen.getByRole('heading', { name: 'Your leagues' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Create a season' })).toBeTruthy();
    expect(screen.getAllByLabelText('Season name')).toHaveLength(2);
    expect(screen.getAllByLabelText('Season')).toHaveLength(2);
    expect(screen.getByLabelText('Player capacity')).toBeTruthy();
    expect(screen.getAllByLabelText('Games per pair')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Create season' })).toBeTruthy();
    expect(screen.getAllByLabelText('Target legs')).toHaveLength(2);
    expect(screen.getAllByLabelText('Points per win')).toHaveLength(2);
    expect(screen.getAllByLabelText('Visibility')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Manage Misfits 501' })).toBeTruthy();
    expect(screen.getByText('Season settings')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Share season' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('League link copied.'));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/league/misfits-501`);
    fireEvent.click(screen.getByRole('button', { name: 'Members & invites' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revoke invite' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Create invite link' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Invite link copied.'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Revoke invite' }))[0]);
    await waitFor(() => expect(screen.getByText('Invite revoked.')).toBeTruthy());
    expect(confirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Results' }));
    expect(screen.getByRole('heading', { name: 'Enter historical result' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record confirmed result' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit result' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Edit result' }));
    expect(screen.getByRole('button', { name: 'Save result' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save result' }));
    await waitFor(() => expect(screen.getByText('Result updated.')).toBeTruthy());
  });

  it('shows one admin control-room task group at a time', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith('/api/admin/leagues')) return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
      if (path.endsWith('/api/admin/players')) return new Response(JSON.stringify({ players: [] }), { status: 200 });
      if (path.endsWith('/members')) return new Response(JSON.stringify({ members: [] }), { status: 200 });
      if (path.endsWith('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/invites')) return new Response(JSON.stringify({ invites: [] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });
    const admin = { ...user, id: 'admin-1', username: 'Admin', role: 'ADMIN' as const, isMasterAdmin: true };

    render(<AdminLeagueDesk user={admin} selectedLeagueId="league-1" />);
    await screen.findByRole('heading', { name: 'League desk' });
    expect(screen.getByRole('navigation', { name: 'Admin workspace' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Season' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Members & invites' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Create a season' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Result queue' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Results' }));
    expect(await screen.findByRole('heading', { name: 'Result queue' })).toBeTruthy();
  });

  it('does not claim an invite was copied when clipboard access is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith('/api/admin/leagues')) return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
      if (path.endsWith('/api/admin/players')) return new Response(JSON.stringify({ players: [] }), { status: 200 });
      if (path.endsWith('/members')) return new Response(JSON.stringify({ members: [] }), { status: 200 });
      if (path.endsWith('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.endsWith('/invites') && init?.method !== 'POST') return new Response(JSON.stringify({ invites: [] }), { status: 200 });
      if (path.endsWith('/invites') && init?.method === 'POST') return new Response(JSON.stringify({ invite: { id: 'invite-2', leagueId: 'league-1', expiresAt: null, url: 'https://misfits.test/join/token' } }), { status: 201 });
      throw new Error(`Unexpected fetch: ${path}`);
    });
    const admin = { ...user, id: 'admin-1', username: 'Admin', role: 'ADMIN' as const, isMasterAdmin: true };

    render(<AdminLeagueDesk user={admin} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'League desk' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Members & invites' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Invite link ready to copy.'));
    expect(screen.getByText('https://misfits.test/join/token')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith('https://misfits.test/join/token');
  });

  it('resets the result form when switching to another league', async () => {
    const secondLeague: LeagueSummary = { ...league, id: 'league-2', name: 'Thursday Club', slug: 'thursday-club', targetLegs: 5 };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      const current = path.includes('league-2') ? secondLeague : league;
      if (path.includes('/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.includes('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/api/public/leagues/')) return new Response(JSON.stringify({ league: current, players: [{ id: user.id, username: 'Alpha', profileImageUrl: null }, { id: current.id === 'league-2' ? 'player-c' : 'player-b', username: current.id === 'league-2' ? 'Charlie' : 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    const { rerender } = render(<PlayerLeague user={user} league={league} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));
    await waitFor(() => expect((screen.getByLabelText('Opponent') as HTMLSelectElement).value).toBe('player-b'));

    rerender(<PlayerLeague user={user} league={secondLeague} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Thursday Club' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));
    await waitFor(() => expect((screen.getByLabelText('Opponent') as HTMLSelectElement).value).toBe('player-c'));
    expect((screen.getByLabelText('Your legs') as HTMLInputElement).value).toBe('5');
  });

  it('makes result entry unavailable when the league is closed', async () => {
    const closedLeague: LeagueSummary = { ...league, status: 'CLOSED' };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes('/standings')) return new Response(JSON.stringify({ standings: [] }), { status: 200 });
      if (path.includes('/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (path.includes('/api/public/leagues/')) return new Response(JSON.stringify({ league: closedLeague, players: [{ id: user.id, username: 'Alpha', profileImageUrl: null }, { id: 'player-b', username: 'Bravo', profileImageUrl: null }] }), { status: 200 });
      if (path.endsWith('/api/me/results')) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      throw new Error(`Unexpected fetch: ${path}`);
    });

    render(<PlayerLeague user={user} league={closedLeague} onUserSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Misfits 501' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add result' }));
    expect(screen.getByText('Result entry is unavailable while this league is closed.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'League closed' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
