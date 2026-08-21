/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const admin: UserSummary = {
  id: 'admin-1', username: 'Admin', role: 'ADMIN', status: 'ACTIVE',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true,
};

const season = {
  id: 's1', name: '2026/27', status: 'OPEN', is_current: 1,
  created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', closed_at: null,
};
const league = {
  id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2026/27', status: 'OPEN',
  points_per_win: 2, target_legs: 3, max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE',
  hierarchy_position: 1, promotion_places: 0, relegation_places: 0,
  created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', created_by: 'admin-1',
};
const members = [
  { league_id: 'l1', season_id: 's1', user_id: 'u1', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Alpha', profile_image_url: null, email: 'a@example.com', status: 'ACTIVE' },
  { league_id: 'l1', season_id: 's1', user_id: 'u2', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Bravo', profile_image_url: null, email: 'b@example.com', status: 'ACTIVE' },
  { league_id: 'l1', season_id: 's1', user_id: 'u3', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Charlie', profile_image_url: null, email: 'c@example.com', status: 'ACTIVE' },
];
const fixtures = [
  { id: 'f1', season_id: 's1', league_id: 'l1', player_a_id: 'u1', player_b_id: 'u2', pair_key: 'u1:u2', round: 1, meeting_number: 1, status: 'PENDING_CONFIRMATION', created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T12:00:00.000Z', voided_at: null, player_a_username: 'Alpha', player_b_username: 'Bravo', result_id: 'r1' },
  { id: 'f2', season_id: 's1', league_id: 'l1', player_a_id: 'u2', player_b_id: 'u3', pair_key: 'u2:u3', round: 2, meeting_number: 1, status: 'OUTSTANDING', created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', voided_at: null, player_a_username: 'Bravo', player_b_username: 'Charlie', result_id: null },
  { id: 'f3', season_id: 's1', league_id: 'l1', player_a_id: 'u1', player_b_id: 'u3', pair_key: 'u1:u3', round: 3, meeting_number: 1, status: 'DISPUTED', created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T12:00:00.000Z', voided_at: null, player_a_username: 'Alpha', player_b_username: 'Charlie', result_id: 'r2' },
];
const pending = {
  id: 'r1', fixtureId: 'f1', leagueId: 'l1', playerAId: 'u1', playerBId: 'u2', playerAUsername: 'Alpha', playerBUsername: 'Bravo',
  playerALegs: 3, playerBLegs: 1, playerAAverage: 51.2, playerBAverage: 47.8, submittedBy: 'u1', status: 'PENDING',
  confirmedBy: null, disputeNote: null, createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null,
};
const disputed = {
  id: 'r2', fixtureId: 'f3', leagueId: 'l1', playerAId: 'u1', playerBId: 'u3', playerAUsername: 'Alpha', playerBUsername: 'Charlie',
  playerALegs: 2, playerBLegs: 3, playerAAverage: 49.1, playerBAverage: 50.4, submittedBy: 'u3', status: 'DISPUTED',
  confirmedBy: null, disputeNote: 'Score is wrong', createdAt: '2026-08-20T12:00:00.000Z', confirmedAt: null,
};

function installApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input);
    const method = init?.method ?? 'GET';
    if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [season] }), { status: 200 });
    if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [
      { id: 'admin-1', email: 'admin@example.com', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', leagueActive: true, profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true },
    ] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/members') return new Response(JSON.stringify({ members }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/fixtures' && method === 'GET') return new Response(JSON.stringify({ fixtures }), { status: 200 });
    if (path === '/api/admin/leagues/l1/results' && method === 'GET') return new Response(JSON.stringify({ results: [pending, disputed] }), { status: 200 });
    if (path === '/api/admin/leagues/l1/results' && method === 'POST') {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ result: {
        id: 'r3', fixtureId: body.fixtureId, leagueId: 'l1', playerAId: 'u2', playerBId: 'u3', playerAUsername: 'Bravo', playerBUsername: 'Charlie',
        playerALegs: body.playerALegs, playerBLegs: body.playerBLegs, playerAAverage: body.playerAAverage, playerBAverage: body.playerBAverage,
        submittedBy: 'admin-1', status: 'CONFIRMED', confirmedBy: 'admin-1', disputeNote: null, createdAt: '2026-08-21T12:00:00.000Z', confirmedAt: '2026-08-21T12:00:00.000Z',
      } }), { status: 201 });
    }
    if (path.startsWith('/api/admin/results/') && method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      const source = path.endsWith('/r2') ? disputed : pending;
      return new Response(JSON.stringify({ result: { ...source, ...body, status: body.status ?? source.status, confirmedBy: body.status === 'CONFIRMED' ? 'admin-1' : source.confirmedBy, confirmedAt: body.status === 'CONFIRMED' ? '2026-08-21T12:00:00.000Z' : source.confirmedAt } }), { status: 200 });
    }
    if (path.startsWith('/api/admin/results/') && method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { status: 200 });
    throw new Error(`Unexpected fetch ${method} ${path}`);
  });
}

describe('admin official-result workflows', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-21T12:00:00.000Z').getTime());
  });

  it('supports fixture entry, pending/dispute context, resolution, correction and confirmed deletion', async () => {
    const fetchMock = installApi();
    render(<AdminCompetitionDesk user={admin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Results' }));

    expect(await screen.findByRole('heading', { name: 'Enter official fixture result' })).toBeTruthy();
    expect(screen.getByText('Pending confirmation')).toBeTruthy();
    expect(screen.getByText('Disputed results')).toBeTruthy();
    expect(screen.getByText(/Fixture f1 · Submitted by Alpha · Opponent Bravo · 1d old/)).toBeTruthy();
    expect(screen.getByText('Score is wrong')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Outstanding fixture'), { target: { value: 'f2' } });
    fireEvent.change(screen.getByLabelText('Player A legs'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Player B legs'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Player A average'), { target: { value: '55.2' } });
    fireEvent.change(screen.getByLabelText('Player B average'), { target: { value: '48.4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record official result' }));
    expect(await screen.findByText('Official result recorded.')).toBeTruthy();
    const create = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/leagues/l1/results' && init?.method === 'POST');
    expect(JSON.parse(String(create?.[1]?.body))).toMatchObject({ fixtureId: 'f2', playerALegs: 3, playerBLegs: 1, playerAAverage: 55.2, playerBAverage: 48.4 });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm disputed result Alpha vs Charlie' }));
    expect(await screen.findByText('Result confirmed.')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/results/r2' && init?.method === 'PATCH' && JSON.parse(String(init.body)).status === 'CONFIRMED')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Edit result Alpha vs Bravo' }));
    fireEvent.change(screen.getByLabelText('Edit player B legs'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save corrected result' }));
    expect(await screen.findByText('Result corrected.')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/results/r1' && init?.method === 'PATCH' && JSON.parse(String(init.body)).playerBLegs === 2)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Delete result Alpha vs Bravo' }));
    expect(await screen.findByRole('dialog', { name: 'Delete result?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input) === '/api/admin/results/r1' && init?.method === 'DELETE')).toBe(true));
  });
});
