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
});
