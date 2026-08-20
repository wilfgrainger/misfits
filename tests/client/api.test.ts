/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../src/client/api';

describe('ApiClient admin workspace calls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the signed-in administrator player list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      players: [{ id: 'user-1', email: 'wjgrainger@gmail.com', username: 'Wilf', role: 'ADMIN', status: 'ACTIVE', leagueActive: true }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(new ApiClient().adminPlayers()).resolves.toMatchObject({ players: [{ username: 'Wilf', role: 'ADMIN' }] });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/players', expect.objectContaining({ credentials: 'include' }));
  });

  it('updates a player role through the administrator endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      player: { id: 'user-2', email: 'player@example.com', username: 'Player', role: 'ADMIN', status: 'ACTIVE', leagueActive: true },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(new ApiClient().updateAdminPlayer('user-2', { role: 'ADMIN' })).resolves.toMatchObject({ player: { role: 'ADMIN' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/players/user-2', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ role: 'ADMIN' }),
    }));
  });

  it('updates a profile and loads the signed-in player leagues', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      profile: { username: 'Wilf', profileImageUrl: 'https://lh3.googleusercontent.com/avatar', dartsCounterUrl: 'https://darts.example/wilf' },
    }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({
      leagues: [{ id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1 }],
    }), { status: 200 }));

    await expect(new ApiClient().updateProfile({ username: 'Wilf', dartsCounterUrl: 'https://darts.example/wilf' })).resolves.toMatchObject({ profile: { username: 'Wilf' } });
    await expect(new ApiClient().myLeagues()).resolves.toMatchObject({ leagues: [{ id: 'league-1', maxPlayers: 16 }] });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/me/profile');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/me/leagues');
  });

  it('submits a result with both player averages', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { id: 'result-1', status: 'PENDING' } }), { status: 201 }));
    await expect(new ApiClient().submitResult('league-1', {
      playerAId: 'player-a', playerBId: 'player-b', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1,
    })).resolves.toMatchObject({ result: { status: 'PENDING' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/leagues/league-1/results', expect.objectContaining({ method: 'POST', body: expect.stringContaining('playerAAverage') }));
  });

  it('loads a league-scoped public player list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ players: [{ id: 'player-1', username: 'Player', profileImageUrl: null }] }), { status: 200 }));
    await expect(new ApiClient().publicPlayers('league-1')).resolves.toMatchObject({ players: [{ id: 'player-1', username: 'Player' }] });
    expect(fetchMock).toHaveBeenCalledWith('/api/public/leagues/league-1/players', expect.objectContaining({ credentials: 'include' }));
  });

  it('loads admin invite metadata without a raw invite token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ invites: [{ id: 'invite-1', leagueId: 'league-1', expiresAt: null, uses: 0, revokedAt: null, createdAt: '2026-08-20T12:00:00.000Z' }] }), { status: 200 }));
    await expect(new ApiClient().adminInvites('league-1')).resolves.toMatchObject({ invites: [{ id: 'invite-1', uses: 0 }] });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/leagues/league-1/invites', expect.objectContaining({ credentials: 'include' }));
  });
});
