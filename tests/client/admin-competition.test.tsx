/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { LeagueSummary, UserSummary } from '../../src/client/api';

const admin: UserSummary = {
  id: 'admin-1', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', clubStatus: 'APPROVED',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true,
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
const l2 = { ...l1, id: 'l2', name: 'Division One', slug: 'division-one', hierarchy_position: 2, promotion_places: 1, relegation_places: 0 };
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
  ambiguity?: boolean;
  readyForFixtures?: boolean;
  onHealthRequest?: (seasonId: string) => Promise<Response>;
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
    if ((path === '/api/admin/seasons/s1/health' || path === '/api/admin/seasons/s2/health') && method === 'GET') {
      const seasonId = path.split('/')[4];
      if (config.onHealthRequest) return config.onHealthRequest(seasonId);
      const health = seasonId === 's1' ? { unassignedPlayers: config.readyForFixtures ? 0 : 1, outstandingFixtures: 2, pendingConfirmations: 3, disputes: 4 } : { unassignedPlayers: 5, outstandingFixtures: 6, pendingConfirmations: 7, disputes: 8 };
      return new Response(JSON.stringify({ health: config.readyForFixtures ? { ...health, readyForFixtures: true } : { ...health, invalidPlayers: 0, duplicatePlacements: 0, readyForFixtures: false } }), { status: 200 });
    }
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
    if (path === '/api/admin/competition/leagues/l3/members') return new Response(JSON.stringify({ members: [] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/members/u3/assign' && method === 'POST') return new Response(JSON.stringify({ membership: { seasonId: 's1', leagueId: 'l2', userId: 'u3', active: true } }), { status: 200 });
    if (path === '/api/admin/seasons/s1/members/u1/move' && method === 'POST') return new Response(JSON.stringify({ membership: { seasonId: 's1', leagueId: 'l2', userId: 'u1', active: true } }), { status: 200 });

    if (path === '/api/admin/competition/leagues/l1/fixtures/preview') return new Response(JSON.stringify({ preview: { seasonId: 's1', leagueId: 'l1', playerCount: 2, matchesPerPair: 1, expectedFixtureCount: 1, fixtures: [{ playerAId: 'u1', playerBId: 'u2', round: 1, meetingNumber: 1 }] } }), { status: 200 });
    if (path.startsWith('/api/admin/competition/leagues/l1/fixtures') && method === 'GET') return new Response(JSON.stringify({ fixtures: [fixture] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/fixtures' && method === 'POST') return new Response(JSON.stringify({ fixtures: [fixture] }), { status: 201 });
    if (path === '/api/admin/competition/leagues/l1/fixtures' && method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (path === '/api/admin/competition/fixtures/f1' && method === 'PATCH') return new Response(JSON.stringify({ fixture: { ...fixture, status: 'VOID' } }), { status: 200 });

    if (path === '/api/admin/seasons/s1/promotion/preview') return new Response(JSON.stringify({ preview: {
      seasonId: 's1', provisional: !config.closed, unresolvedCount: 0,
      movements: [{ userId: 'u1', fromLeagueId: 'l2', toLeagueId: 'l1', fromPosition: 1, kind: 'PROMOTED' }],
      ambiguities: config.ambiguity ? [{ leagueId: 'l2', boundary: 'PROMOTION', position: 1, tiedUserIds: ['u1', 'u2'] }] : [],
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
      { id: 'admin-1', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', clubStatus: 'APPROVED', createdAt: '2026-08-01T00:00:00.000Z', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true },
      { id: 'u4', email: 'delta@example.com', username: 'Delta', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED', createdAt: '2026-08-10T00:00:00.000Z', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false },
    ] }), { status: 200 });
    if (path === '/api/admin/players/u4' && method === 'PATCH') return new Response(JSON.stringify({ player: { id: 'u4', email: 'delta@example.com', username: 'Delta', role: 'ADMIN', status: 'ACTIVE', clubStatus: 'APPROVED', createdAt: '2026-08-10T00:00:00.000Z', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false } }), { status: 200 });
    if (path === '/api/admin/club-invites' && method === 'GET') return new Response(JSON.stringify({ invites: [] }), { status: 200 });

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
    const desk = document.querySelector('[data-admin-layout="control-room"]');
    expect(desk).toBeTruthy();
    expect(desk?.querySelector('[data-layout-region="rail"]')).toBe(tabs);
    expect(within(tabs).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Season', 'Leagues', 'Season members', 'Fixtures', 'Results', 'Promotion', 'Club access',
    ]);
    expect(screen.getByText('2026/27')).toBeTruthy();
    expect(screen.getByText('Current')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('New season name'), { target: { value: '2028/29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create season' }));
    await screen.findByText('Season created.');
    const create = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/seasons' && init?.method === 'POST');
    expect(JSON.parse(String(create?.[1]?.body))).toEqual({ name: '2028/29', status: 'DRAFT', isCurrent: false });
  });

  it('offers a compact task switcher that reaches every admin workspace', async () => {
    renderDesk();

    const switcher = await screen.findByRole('combobox', { name: 'Admin task' });
    expect(within(switcher).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Season', 'Leagues', 'Season members', 'Fixtures', 'Results', 'Promotion', 'Club access',
    ]);

    fireEvent.change(switcher, { target: { value: 'access' } });

    expect(screen.getByRole('region', { name: 'Pending membership requests' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Club members' })).toBeTruthy();
    expect((switcher as HTMLSelectElement).value).toBe('access');
  });

  it('shows concise health for the selected season', async () => {
    renderDesk();

    const health = await screen.findByRole('region', { name: 'Season health' });
    expect(within(health).getByText('Unassigned players')).toBeTruthy();
    expect(within(health).getByText('Outstanding fixtures')).toBeTruthy();
    expect(within(health).getByText('Pending confirmations')).toBeTruthy();
    expect(within(health).getByText('Disputes')).toBeTruthy();
    expect(within(health).getByText('1')).toBeTruthy();
    expect(within(health).getByText('2')).toBeTruthy();
    expect(within(health).getByText('3')).toBeTruthy();
    expect(within(health).getByText('4')).toBeTruthy();
  });

  it('keeps health tied to the newest selected season response', async () => {
    const resolvers: Record<string, (response: Response) => void> = {};
    renderDesk({
      onHealthRequest: (seasonId) => new Promise((resolve) => {
        resolvers[seasonId] = resolve;
      }),
    });
    await waitFor(() => expect(resolvers.s1).toBeTruthy());

    fireEvent.click(await screen.findByRole('button', { name: /2027\/28/ }));
    await waitFor(() => expect(resolvers.s2).toBeTruthy());
    resolvers.s2(new Response(JSON.stringify({ health: { unassignedPlayers: 20, outstandingFixtures: 21, pendingConfirmations: 22, disputes: 23 } }), { status: 200 }));

    const health = await screen.findByRole('region', { name: 'Season health' });
    await waitFor(() => expect(within(health).getByText('20')).toBeTruthy());
    resolvers.s1(new Response(JSON.stringify({ health: { unassignedPlayers: 1, outstandingFixtures: 2, pendingConfirmations: 3, disputes: 4 } }), { status: 200 }));

    await waitFor(() => expect(within(health).getByText('20')).toBeTruthy());
    expect(within(health).queryByText('1')).toBeNull();
  });

  it('reloads season health when Refresh keeps the same season selected', async () => {
    let healthCalls = 0;
    const { fetchMock } = renderDesk({
      onHealthRequest: async () => {
        healthCalls += 1;
        const offset = healthCalls === 1 ? 0 : 10;
        return new Response(JSON.stringify({ health: { unassignedPlayers: 1 + offset, outstandingFixtures: 2 + offset, pendingConfirmations: 3 + offset, disputes: 4 + offset } }), { status: 200 });
      },
    });
    const health = await screen.findByRole('region', { name: 'Season health' });
    await waitFor(() => expect(within(health).getByText('1')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => String(input) === '/api/admin/seasons/s1/health')).toHaveLength(2));
    await waitFor(() => expect(within(health).getByText('11')).toBeTruthy());
  });

  it('shows ordered league structure and saves hierarchy, rules and movement places', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const structure = await screen.findByRole('list', { name: 'Ordered league structure' });
    const structureButtons = await within(structure).findAllByRole('button');
    expect(structureButtons.map((button) => button.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('1 Premier'), expect.stringContaining('2 Division One')]));
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

  it('assigns unplaced players and moves existing members without creating admission invites', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Season members' }));
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
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/invites'))).toBe(false);
  });

  it('previews, commits, filters and confirms fixture voiding before mutation', async () => {
    const { fetchMock } = renderDesk({ readyForFixtures: true });
    fireEvent.click(await screen.findByRole('tab', { name: 'Fixtures' }));
    await screen.findByText('Outstanding 1');
    expect(screen.getByText('Pending 0')).toBeTruthy();
    expect(screen.getByText('Disputed 0')).toBeTruthy();
    expect(screen.getByText('Completed 0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Preview fixtures' }));
    await screen.findByText('1 fixture expected');
    fireEvent.click(screen.getByRole('button', { name: 'Commit fixtures' }));
    await screen.findByText('Fixtures committed.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/competition/leagues/l1/fixtures' && init?.method === 'POST')).toBe(true);
    const voidFixture = screen.getByRole('button', { name: 'Void Alpha vs Bravo' });
    expect(voidFixture.classList.contains('danger-button')).toBe(true);
    expect(screen.getByRole('button', { name: 'Reset before play' }).classList.contains('danger-button')).toBe(true);
    voidFixture.focus();
    fireEvent.click(voidFixture);
    const dialog = await screen.findByRole('dialog', { name: 'Void fixture?' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirm' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/competition/fixtures/f1' && init?.method === 'PATCH')).toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(voidFixture));

    fireEvent.click(voidFixture);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await screen.findByText('Fixture voided.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/competition/fixtures/f1' && init?.method === 'PATCH')).toBe(true);
  });

  it('blocks fixture generation in the desktop control room until the whole season is ready', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Fixtures' }));

    expect(await screen.findByRole('alert', { name: 'Fixture readiness' })).toBeTruthy();
    expect(screen.getByText(/Fixture generation is blocked until season placement is resolved/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Preview fixtures' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Commit fixtures' }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).includes('/fixtures/preview') && init?.method !== 'GET')).toBe(false);
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

  it('shows tied promotion boundaries as unresolved before movement is applied', async () => {
    renderDesk({ ambiguity: true });
    fireEvent.click(await screen.findByRole('tab', { name: 'Promotion' }));

    expect(await screen.findByText('Promotion boundary in Division One is tied')).toBeTruthy();
    expect((await screen.findByText('Position 1: Alpha and Bravo are tied.')).textContent).toBe('Position 1: Alpha and Bravo are tied.');
  });

  it('keeps result correction and club-access operations inside the unified admin task rail', async () => {
    const { fetchMock } = renderDesk();
    fireEvent.click(await screen.findByRole('tab', { name: 'Results' }));
    expect(await screen.findByRole('heading', { name: 'Enter official fixture result' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit result Alpha vs Bravo' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Club access' }));
    expect(await screen.findByText(/delta@example\.com/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Make Delta admin' }));
    await screen.findByText('Club access updated.');
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/players/u4' && init?.method === 'PATCH')).toBe(true);
  });
});
