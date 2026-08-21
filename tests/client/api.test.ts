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
      profile: { username: 'Wilf', profileImageUrl: 'https://lh3.googleusercontent.com/avatar', dartsCounterUrl: 'https://dartcounter.net/wilf' },
    }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({
      leagues: [{ id: 'league-1', name: 'Misfits 501', slug: 'misfits-501', seasonName: '2026', status: 'OPEN', pointsPerWin: 2, targetLegs: 3, maxPlayers: 16, matchesPerPair: 1, visibility: 'PUBLIC' }],
    }), { status: 200 }));

    await expect(new ApiClient().updateProfile({ username: 'Wilf', dartsCounterUrl: 'https://dartcounter.net/wilf' })).resolves.toMatchObject({ profile: { username: 'Wilf' } });
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

  it('normalizes season and competition-league administration contracts', async () => {
    const season = { id: 's1', name: '2026/27', status: 'OPEN', is_current: 1, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', closed_at: null };
    const league = { id: 'l1', name: 'Premier', slug: 'premier', season_name: '2026/27', season_id: 's1', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', created_by: 'admin', max_players: 10, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 0, relegation_places: 2 };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ seasons: [season] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ season }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ season }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ leagues: [league] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ league }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ league }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const client = new ApiClient();
    await expect(client.adminSeasons()).resolves.toMatchObject({ seasons: [{ id: 's1', isCurrent: true, closedAt: null }] });
    await expect(client.createAdminSeason({ name: '2026/27', status: 'OPEN', isCurrent: true })).resolves.toMatchObject({ season: { isCurrent: true } });
    await expect(client.updateAdminSeason('s1', { status: 'CLOSED' })).resolves.toMatchObject({ season: { id: 's1' } });
    await expect(client.deleteAdminSeason('s1')).resolves.toEqual({ ok: true });
    await expect(client.seasonLeagues('s1')).resolves.toMatchObject({ leagues: [{ id: 'l1', seasonId: 's1', hierarchyPosition: 1, relegationPlaces: 2 }] });
    await expect(client.createSeasonLeague('s1', { name: 'Premier', maxPlayers: 10 })).resolves.toMatchObject({ league: { seasonName: '2026/27' } });
    await expect(client.updateCompetitionLeague('l1', { promotionPlaces: 1 })).resolves.toMatchObject({ league: { pointsPerWin: 2 } });
    await expect(client.deleteCompetitionLeague('l1')).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/seasons',
      '/api/admin/seasons',
      '/api/admin/seasons/s1',
      '/api/admin/seasons/s1',
      '/api/admin/seasons/s1/leagues',
      '/api/admin/seasons/s1/leagues',
      '/api/admin/competition/leagues/l1',
      '/api/admin/competition/leagues/l1',
    ]);
  });

  it('normalizes season membership placement contracts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ users: [{ id: 'u1', username: 'Alpha', email: 'a@example.com', status: 'ACTIVE' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ members: [{ league_id: 'l1', season_id: 's1', user_id: 'u1', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Alpha', profile_image_url: null, email: 'a@example.com', status: 'ACTIVE' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ membership: { seasonId: 's1', leagueId: 'l1', userId: 'u1', active: true } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ membership: { seasonId: 's1', leagueId: 'l2', userId: 'u1', active: true } }), { status: 200 }));

    const client = new ApiClient();
    await expect(client.seasonUnassigned('s1')).resolves.toMatchObject({ users: [{ id: 'u1', username: 'Alpha' }] });
    await expect(client.competitionMembers('l1')).resolves.toMatchObject({ members: [{ seasonId: 's1', leagueId: 'l1', userId: 'u1', active: true }] });
    await expect(client.assignSeasonMember('s1', 'u1', 'l1')).resolves.toMatchObject({ membership: { leagueId: 'l1' } });
    await expect(client.moveSeasonMember('s1', 'u1', 'l1', 'l2')).resolves.toMatchObject({ membership: { leagueId: 'l2' } });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/seasons/s1/unassigned',
      '/api/admin/competition/leagues/l1/members',
      '/api/admin/seasons/s1/members/u1/assign',
      '/api/admin/seasons/s1/members/u1/move',
    ]);
  });

  it('normalizes fixture administration and fixture-first result contracts', async () => {
    const fixture = { id: 'f1', season_id: 's1', league_id: 'l1', player_a_id: 'u1', player_b_id: 'u2', pair_key: 'u1:u2', round: 1, meeting_number: 1, status: 'OUTSTANDING', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', voided_at: null, player_a_username: 'Alpha', player_b_username: 'Bravo', result_id: null };
    const preview = { seasonId: 's1', leagueId: 'l1', playerCount: 2, matchesPerPair: 1, expectedFixtureCount: 1, fixtures: [{ playerAId: 'u1', playerBId: 'u2', round: 1, meetingNumber: 1 }] };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ preview }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fixtures: [fixture] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fixtures: [fixture] }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fixture: { ...fixture, status: 'VOID' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { id: 'r1', fixtureId: 'f1', status: 'PENDING' } }), { status: 201 }));

    const client = new ApiClient();
    await expect(client.fixturePreview('l1')).resolves.toMatchObject({ preview: { expectedFixtureCount: 1 } });
    await expect(client.fixtures('l1', 'OUTSTANDING')).resolves.toMatchObject({ fixtures: [{ id: 'f1', seasonId: 's1', playerAUsername: 'Alpha' }] });
    await expect(client.commitFixtures('l1')).resolves.toMatchObject({ fixtures: [{ meetingNumber: 1 }] });
    await expect(client.setFixtureStatus('f1', 'VOID')).resolves.toMatchObject({ fixture: { status: 'VOID' } });
    await expect(client.resetFixtures('l1')).resolves.toEqual({ ok: true });
    await expect(client.submitFixtureResult('l1', { fixtureId: 'f1', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.2, playerBAverage: 47.8 })).resolves.toMatchObject({ result: { fixtureId: 'f1' } });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/competition/leagues/l1/fixtures?status=OUTSTANDING');
    expect(fetchMock.mock.calls[5][1]).toEqual(expect.objectContaining({ method: 'POST', body: expect.stringContaining('fixtureId') }));
  });

  it('normalizes promotion preview, proposal, override and apply contracts', async () => {
    const movement = { id: 'm1', from_season_id: 's1', to_season_id: 's2', user_id: 'u1', from_league_id: 'l2', to_league_id: 'n1', from_position: 1, kind: 'PROMOTED', status: 'PROPOSED', reason: null, decided_by: null, created_at: '2026-08-21T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z' };
    const preview = { seasonId: 's1', provisional: false, unresolvedCount: 0, movements: [{ userId: 'u1', fromLeagueId: 'l2', toLeagueId: 'l1', fromPosition: 1, kind: 'PROMOTED' }], ambiguities: [] };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ preview }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ movements: [movement] }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ movement: { ...movement, to_league_id: 'n2', kind: 'MANUAL', reason: 'Committee review' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ placements: [{ userId: 'u1', leagueId: 'n2' }], movements: [{ ...movement, to_league_id: 'n2', kind: 'MANUAL', status: 'APPLIED' }] }), { status: 200 }));

    const client = new ApiClient();
    await expect(client.promotionPreview('s1')).resolves.toMatchObject({ preview: { provisional: false, movements: [{ userId: 'u1' }] } });
    await expect(client.createPromotionProposal('s1', 's2')).resolves.toMatchObject({ movements: [{ fromSeasonId: 's1', toLeagueId: 'n1' }] });
    await expect(client.overridePromotionMovement('s1', 'u1', 'n2', 'Committee review')).resolves.toMatchObject({ movement: { kind: 'MANUAL', reason: 'Committee review' } });
    await expect(client.applyPromotionProposal('s1', 's2')).resolves.toMatchObject({ placements: [{ userId: 'u1', leagueId: 'n2' }], movements: [{ status: 'APPLIED' }] });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/seasons/s1/promotion/preview',
      '/api/admin/seasons/s1/promotion/proposal',
      '/api/admin/seasons/s1/promotion/u1',
      '/api/admin/seasons/s1/promotion/apply',
    ]);
  });
});
