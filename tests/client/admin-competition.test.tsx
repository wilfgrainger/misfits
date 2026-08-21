/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const admin: UserSummary = {
  id: 'admin-1',
  username: 'Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
  profileImageUrl: null,
  dartsCounterUrl: null,
  isMasterAdmin: true,
};

const season1 = {
  id: 's1', name: '2026/27', status: 'OPEN', is_current: 1,
  created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', closed_at: null,
};
const season2 = {
  id: 's2', name: '2027/28', status: 'DRAFT', is_current: 0,
  created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', closed_at: null,
};

const l1 = {
  id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2026/27', status: 'OPEN',
  points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', created_by: 'admin-1',
  max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 0, relegation_places: 1,
};
const l2 = {
  ...l1, id: 'l2', name: 'Division One', slug: 'division-one', hierarchy_position: 2, promotion_places: 1, relegation_places: 0,
};
const n1 = { ...l1, id: 'n1', season_id: 's2', season_name: '2027/28', status: 'OPEN', slug: 'next-premier' };
const n2 = { ...l2, id: 'n2', season_id: 's2', season_name: '2027/28', status: 'OPEN', slug: 'next-division-one' };

const fixture = {
  id: 'f1', season_id: 's1', league_id: 'l1', player_a_id: 'u1', player_b_id: 'u2', pair_key: 'u1:u2',
  round: 1, meeting_number: 1, status: 'OUTSTANDING', created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z',
  voided_at: null, player_a_username: 'Alpha', player_b_username: 'Bravo', result_id: null,
};

const result = {
  id: 'r1', fixtureId: 'f1', leagueId: 'l1', playerAId: 'u1', playerBId: 'u2', playerAUsername: 'Alpha', playerBUsername: 'Bravo',
  playerALegs: 3, playerBLegs: 1, playerAAverage: 51.2, playerBAverage: 47.8, submittedBy: 'u1', status: 'CONFIRMED',
  confirmedBy: 'u2', disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: '2026-08-20T12:05:00.000Z',
};

interface FixtureConfig {
  closed?: boolean;
}

function installApi(config: FixtureConfig = {}) {
  const sourceSeason = config.closed ? { ...season1, status: 'CLOSED', closed_at: '2026-08-21T00:00:00.000Z' } : season1;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input);
    const method = init?.method ?? 'GET';

    if (path === '/api/admin/seasons' && method === 'GET') return new Response(JSON.stringify({ seasons: [sourceSeason, season2] }), { status: 200 });
    if (path === '/api/admin/seasons' && method === 'POST') return new Response(JSON.stringify({ season: { ...season2, id: 's3', name: '2028/29' } }), { status: 201 });
    if (path === '/api/admin/seasons/s1' && method === 'PATCH') return new Response(JSON.stringify({ season: { ...sourceSeason, status: 'CLOSED' } }), { status: 200 });
    if (path === '/api/admin/seasons/s1' && method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { status: 200 });

    if (path === '/api/admin/seasons/s1/leagues' && method === 'GET') return new Response(JSON.stringify({ leagues: [l1, l2] }), { status: 200 });
    if (path === '/api/admin/seasons/s2/leagues' && method === 'GET') return new Response(JSON.stringify({ leagues: [n1, n2] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/leagues' && method === 'POST') {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ league: { ...l2, id: 'l3', name: body.name, hierarchy_position: body.hierarchyPosition ?? 3 } }), { status: 201 });
    }
    if (path === '/api/admin/competition/leagues/l1' && method === 'PATCH') return new Response(JSON.stringify({ league: { ...l1, relegation_places: 2 } }), { status: 200 });
    if (path.startsWith('/api/admin/competition/leagues/') && method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { status: 200 });

    if (path === '/api/admin/seasons/s1/unassigned') return new Response(JSON.stringify({ users: [{ id: 'u3', username: 'Charlie', email: 'charlie@example.com', status: 'ACTIVE' }] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/members') return new Response(JSON.stringify({ members: [
      { league_id: 'l1', season_id: 's1', user_id: 'u1', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Alpha', profile_image_url: null, email: 'alpha@example.com', status: 'ACTIVE' },
      { league_id: 'l1', season_id: 's1', user_id: 'u2', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Bravo', profile_image_url: null, email: 'bravo@example.com', status: 'ACTIVE' },
    ] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l2/members') return new Response(JSON.stringify({ members: [] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/members/u3/assign' && method === 'POST') return new Response(JSON.stringify({ membership: { seasonId: 's1', leagueId: 'l2', userId: 'u3', active: true } }), { status: 200 });
    if (path === '/api/admin/seasons/s1/members/u1/move' && method === 'POST') return new Response(JSON.stringify({ membership: { seasonId: 's1', leagueId: 'l2', userId: 'u1', active: true } }), { status: 200 });

    if (path === '/api/admin/leagues/l1/invites' && method === 'GET') return new Response(JSON.stringify({ invites: [] }), { status: 200 });
    if (path === '/api/admin/leagues/l1/invites' && method === 'POST') return new Response(JSON.stringify({ invite: { id: 'i1', leagueId: 'l1', expiresAt: null, url: 'https://misfits.test/join/token' } }), { status: 201 });
    if (path.startsWith('/api/admin/invites/') && method === 'POST') return new Response(JSON.stringify({ ok: true }), { status: 200 });

    if (path === '/api/admin/competition/leagues/l1/fixtures/preview') return new Response(JSON.stringify({ preview: { seasonId: 's1', leagueId: 'l1', playerCount: 2, matchesPerPair: 1, expectedFixtureCount: 1, fixtures: [{ playerAId: 'u1', playerBId: 'u2', round: 1, meetingNumber: 1 }] } }), { status: 200 });
    if (path.startsWith('/api/admin/competition/leagues/l1/fixtures') && method === 'GET') return new Response(JSON.stringify({ fixtures: [fixture] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/fixtures' && method === 'POST') return new Response(JSON.stringify({ fixtures: [fixture] }), { status: 201 });
    if (path === '/api/admin/competition/leagues/l1/fixtures' && method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (path === '/api/admin/competition/fixtures/f1' && method === 'PATCH') return new Response(JSON.stringify({ fixture: { ...fixture, status: 'VOID' } }), { status: 200 });

    if (path === '/api/admin/seasons/s1/promotion/preview') return new Response(JSON.stringify({ preview: {
      seasonId: 's1', provisional: !config.closed, unresolvedCount: 0,
      movements: [{ userId: 'u1', fromLeagueId: 'l2', toLeagueId: 'l1', fromPosition: 1, kind: 'PROMOTED' }], ambiguities: [],
    } }), { status: 200 });
    if (path === '/api/admin/seasons/s1/promotion/proposal' && method === 'POST') return new Response(JSON.stringify({ movements: [{
      id: 'm1', from_season_id: 's1', to_season_id: 's2', user_id: 'u1', from_league_id: 'l2', to_league_id: 'n1', from_position: 1,
      kind: 'PROMOTED', status: 'PROPOSED', reason: null, decided_by: null, created_at: '2026-08-21T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z',
    }] }), { status: 201 });
    if (path === '/api/admin/seasons/s1/promotion/u1' && method === 'PATCH') return new Response(JSON.stringify({ movement: {
      id: 'm1', from_season_id: 's1', to_season_id: 's2', user_id: 'u1', from_league_id: 'l2', to_league_id: 'n2', from_position: 1,
      kind: 'MANUAL', status: 'PROPOSED', reason: 'Committee review', decided_by: 'admin-1', created_at: '2026-08-21T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z',
    } }), { status: 200 });
    if (path === '/api/admin/seasons/s1/promotion/apply' && method === 'POST') return new Response(JSON.stringify({ placements: [{ userId: 'u1', leagueId: 'n2' }], movements: [] }), { status: 200 });

    if (path === '/api/admin/leagues/l1/results' && method === 'GET') return new Response(JSON.stringify({ results: [result] }), { status: 200 });
    if (path === '/api/admin/leagues/l1/results' && method === 'POST') return new Response(JSON.stringify({ result }), { status: 201 });
    if (path.startsWith('/api/admin/results/') && method === 'PATCH') return new Response(JSON.stringify({ result }), { status: 200 });
    if (path.startsWith('/api/admin/results/') && method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { status: 200 });

    if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [
      { id: 'admin-1', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true },
      { id: 'u4', email: 'delta@example.com', username: 'Delta', role: 'PLAYER', status: 'ACTIVE', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false },
    ] }), { status: 200 });
    if (path === '/api/admin/players/u4' && method === 'PATCH') return new Response(JSON.stringify({ player: { id: 'u4', email: 'delta@example.com', username: 'Delta', role: 'ADMIN', status: 'ACTIVE', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false } }), { status: 200 });

    throw new Error(`Unexpected fetch ${method} ${path}`);
  });
}

function renderDesk(config: FixtureConfig = {}) {
  const fetchMock = installApi(config);
  const callbacks = {
    onLeagueSelected: vi.fn<(league: LeagueSummary | null) => void>(),
    onLeagueCreated: vi.fn<(league: LeagueSummary) => void>(),
    onLeagueChanged: vi.fn<(league: LeagueSummary) => void>(),
  };
  render(<AdminCompetitionDesk user={admin} {...callbacks} />);
  return { fetchMock, ...callbacks };
}

describe('administrator competition workspace', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('presents seven accessible admin tasks and creates a new durable season', async () => {
    const { fetchMock } = renderDesk();
    const tabs = await screen.findByRole('tablist', { name: 'Competition administration tasks' });
    expect(within(tabs).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Season', 'Leagues', 'Members & invites', 'Fixtures', 'Results', 'Promotion', 'Club access',
    ]);
    expect(screen.getByText('2026/27')).toBeTruthy();
    expect(screen.getByText('Current')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('New season name'), { target: { value: '2028/29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create season' }));
    await screen.findByText('Season created.');

    const create = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/seasons' && init?.method === 'POST');
    expect(create).toBeTruthy();
    expect(JSON.parse(String(create?.[1]?.body))).toEqual({ name: '2028/29', status: 'DRAFT', isCurrent: false });
  });

  it('shows ordered league structure and saves hierarchy, rules and movement places', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const structure = await screen.findByRole('list', { name: 'Ordered league structure' });
    expect(within(structure).getAllByRole('button').map((button) => button.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('1 Premier'), expect.stringContaining('2 Division One'),
    ]));

    fireEvent.click(within(structure).getByRole('button', { name: /1 Premier/ }));
    fireEvent.change(screen.getByLabelText('Relegation places'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save league' }));
    await screen.findByText('League settings saved.');
    const update = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/competition/leagues/l1' && init?.method === 'PATCH');
    expect(JSON.parse(String(update?.[1]?.body))).toMatchObject({ hierarchyPosition: 1, relegationPlaces: 2, promotionPlaces: 0, matchesPerPair: 1 });

    fireEvent.change(screen.getByLabelText('New league name'), { target: { value: 'Division Two' } });
    fireEvent.change(screen.getByLabelText('New hierarchy position'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create league' }));
    await screen.findByText('League created.');
    const create = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/seasons/s1/leagues' && init?.method === 'POST');
    expect(JSON.parse(String(create?.[1]?.body))).toMatchObject({ name: 'Division Two', hierarchyPosition: 3 });
  });

  it('assigns unplaced players, moves existing members, and creates a season-league invite', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Members & invites' }));
    await screen.findByText('Charlie');
    expect((await screen.findAllByText('Alpha'))[0]).toBeTruthy();

    fireEvent.change(screen.getByLabelText('League for Charlie'), { target: { value: 'l2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Charlie' }));
    await screen.findByText('Player assigned.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/seasons/s1/members/u3/assign' && init?.method === 'POST')).toBe(true);

    fireEvent.change(screen.getByLabelText('Move Alpha'), { target: { value: 'l2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move Alpha' }));
    await screen.findByText('Player moved.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/seasons/s1/members/u1/move' && init?.method === 'POST')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Create invite for Premier' }));
    await screen.findByDisplayValue('https://misfits.test/join/token');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/leagues/l1/invites' && init?.method === 'POST')).toBe(true);
  });

  it('previews, commits, filters and voids persisted fixtures with visible health counts', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Fixtures' }));
    await screen.findByText('Outstanding 1');
    expect(screen.getByText('Pending 0')).toBeTruthy();
    expect(screen.getByText('Disputed 0')).toBeTruthy();
    expect(screen.getByText('Completed 0')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Preview fixtures' }));
    await screen.findByText('1 fixture expected');
    expect(screen.getAllByText(/Round 1/)[0]).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Commit fixtures' }));
    await screen.findByText('Fixtures committed.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/competition/leagues/l1/fixtures' && init?.method === 'POST')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Void Alpha vs Bravo' }));
    await screen.findByText('Fixture voided.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/competition/fixtures/f1' && init?.method === 'PATCH')).toBe(true);
  });

  it('reviews final movements, records an explicit override, then applies the next-season plan', async () => {
    const { fetchMock } = renderDesk({ closed: true });
    fireEvent.click(await screen.findByRole('tab', { name: 'Promotion' }));
    expect((await screen.findAllByText('Alpha'))[0]).toBeTruthy();
    expect(screen.getByText(/Division One → Premier/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Next season'), { target: { value: 's2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create promotion proposal' }));
    await screen.findByText('Promotion proposal created.');

    fireEvent.change(screen.getByLabelText('Override destination for Alpha'), { target: { value: 'n2' } });
    fireEvent.change(screen.getByLabelText('Override reason for Alpha'), { target: { value: 'Committee review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save override for Alpha' }));
    await screen.findByText('Movement override saved.');

    fireEvent.click(screen.getByRole('button', { name: 'Apply to next season' }));
    await screen.findByText('Next-season placements applied.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/seasons/s1/promotion/apply' && init?.method === 'POST')).toBe(true);
  });

  it('keeps result correction and club-access operations inside the unified admin task rail', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Results' }));
    expect(await screen.findByText(/Alpha 3 - 1 Bravo/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit result' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Club access' }));
    expect(await screen.findByText(/delta@example\.com/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Make Delta admin' }));
    await screen.findByText('Club access updated.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/players/u4' && init?.method === 'PATCH')).toBe(true);
  });
});
