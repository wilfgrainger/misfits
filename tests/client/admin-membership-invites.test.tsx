/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const admin: UserSummary = {
  id: 'admin-1', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', clubStatus: 'APPROVED',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true,
};

const season = {
  id: 's1', name: '2026/27', status: 'OPEN', is_current: 1,
  created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', closed_at: null,
};
const nextSeason = {
  id: 's2', name: '2027/28', status: 'DRAFT', is_current: 0,
  created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', closed_at: null,
};
const league = {
  id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2026/27', status: 'OPEN',
  points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', created_by: 'admin-1',
  max_players: 8, matches_per_pair: 2, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 0, relegation_places: 1,
};
const nextLeague = { ...league, id: 'n1', season_id: 's2', season_name: '2027/28', status: 'CLOSED', slug: 'premier-next' };

const clubPlayers = [
  { id: 'admin-1', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', clubStatus: 'APPROVED', createdAt: '2026-08-01T00:00:00.000Z', leagueActive: true, isMasterAdmin: true, profileImageUrl: null, dartsCounterUrl: null },
  { id: 'pending-1', email: 'pending@example.com', username: null, role: 'PLAYER', status: 'ACTIVE', clubStatus: 'PENDING', createdAt: '2026-08-22T18:15:00.000Z', leagueActive: false, isMasterAdmin: false, profileImageUrl: null, dartsCounterUrl: null },
  { id: 'member-1', email: 'member@example.com', username: 'Charlie', role: 'PLAYER', status: 'ACTIVE', clubStatus: 'APPROVED', createdAt: '2026-08-10T09:00:00.000Z', leagueActive: false, isMasterAdmin: false, profileImageUrl: null, dartsCounterUrl: null },
];

function installApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input);
    const method = init?.method ?? 'GET';

    if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [season, nextSeason] }), { status: 200 });
    if (path === '/api/admin/players' && method === 'GET') return new Response(JSON.stringify({ players: clubPlayers }), { status: 200 });
    if (path === '/api/admin/players/pending-1' && method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ player: { ...clubPlayers[1], clubStatus: body.clubStatus } }), { status: 200 });
    }
    if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
    if (path === '/api/admin/seasons/s2/leagues') return new Response(JSON.stringify({ leagues: [nextLeague] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/unassigned') return new Response(JSON.stringify({ users: [] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/members') return new Response(JSON.stringify({ members: [
      { league_id: 'l1', season_id: 's1', user_id: 'u1', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Alpha', profile_image_url: null, email: 'alpha@example.com', status: 'ACTIVE' },
      { league_id: 'l1', season_id: 's1', user_id: 'u2', active: 0, joined_at: '2026-08-01T00:00:00.000Z', username: 'Bravo', profile_image_url: null, email: 'bravo@example.com', status: 'ACTIVE' },
    ] }), { status: 200 });
    if (path === '/api/admin/leagues/l1/members/u1' && method === 'PATCH') return new Response(JSON.stringify({ member: { userId: 'u1', active: false } }), { status: 200 });
    if (path === '/api/admin/leagues/l1/members/u2' && method === 'PATCH') return new Response(JSON.stringify({ member: { userId: 'u2', active: true } }), { status: 200 });
    if (path === '/api/admin/club-invites' && method === 'GET') return new Response(JSON.stringify({ invites: [
      { id: 'i-old', expiresAt: '2026-09-01T18:00:00.000Z', uses: 3, revokedAt: null, createdAt: '2026-08-20T00:00:00.000Z' },
      { id: 'i-revoked', expiresAt: null, uses: 1, revokedAt: '2026-08-21T00:00:00.000Z', createdAt: '2026-08-19T00:00:00.000Z' },
    ] }), { status: 200 });
    if (path === '/api/admin/club-invites' && method === 'POST') return new Response(JSON.stringify({ invite: { id: 'i-new', expiresAt: null, url: 'https://misfits.test/join/token-secret' } }), { status: 201 });
    if (path === '/api/admin/club-invites/i-old/revoke' && method === 'POST') return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (path === '/api/admin/seasons/s1/members/copy' && method === 'POST') return new Response(JSON.stringify({ placements: [{ userId: 'u1', leagueId: 'n1' }] }), { status: 201 });

    throw new Error(`Unexpected fetch ${method} ${path}`);
  });
}

describe('admin membership, placement and club-admission controls', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('keeps season placement separate and allows safe membership deactivate/reactivate', async () => {
    const fetchMock = installApi();
    render(<AdminCompetitionDesk user={admin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Season members' }));

    expect(await screen.findByText('Premier · 1/8')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Create invite/i })).toBeNull();
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bravo').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Alpha' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/leagues/l1/members/u1' && init?.method === 'PATCH' && JSON.parse(String(init.body)).active === false)).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Bravo' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/leagues/l1/members/u2' && init?.method === 'PATCH' && JSON.parse(String(init.body)).active === true)).toBe(true));
  });

  it('copies reviewed baseline placements into a selected draft season without hiding the explicit action', async () => {
    const fetchMock = installApi();
    render(<AdminCompetitionDesk user={admin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Season members' }));
    await screen.findByText('Premier · 1/8');

    fireEvent.change(screen.getByLabelText('Draft season for baseline placements'), { target: { value: 's2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy current placements to draft' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/previous-season membership remains unchanged/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    await screen.findByText('Draft baseline placements copied.');
    const call = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/seasons/s1/members/copy' && init?.method === 'POST');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ toSeasonId: 's2' });
  });

  it('puts pending club requests first and approves membership without league placement', async () => {
    const fetchMock = installApi();
    render(<AdminCompetitionDesk user={admin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Club access' }));

    const pending = await screen.findByRole('region', { name: 'Pending membership requests' });
    expect(within(pending).getByText('pending@example.com')).toBeTruthy();
    expect(within(pending).getByText(/22 Aug 2026/i)).toBeTruthy();
    fireEvent.click(within(pending).getByRole('button', { name: 'Approve pending@example.com' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/players/pending-1' && init?.method === 'PATCH' && JSON.parse(String(init.body)).clubStatus === 'APPROVED')).toBe(true));
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/assign'))).toBe(false);
  });

  it('shows club-wide invite usage, expiry and revocation with a working copy action', async () => {
    installApi();
    render(<AdminCompetitionDesk user={admin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Club access' }));

    expect(await screen.findByText(/3 uses · Expires 1 Sep 2026/i)).toBeTruthy();
    expect(screen.getByText('Revoked invite')).toBeTruthy();
    expect(screen.queryByText(/Premier invites/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Create club invite' }));
    await screen.findByDisplayValue('https://misfits.test/join/token-secret');
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://misfits.test/join/token-secret'));
    expect(await screen.findByText('Invite link copied.')).toBeTruthy();
  });
});
