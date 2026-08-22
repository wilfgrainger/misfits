/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const admin: UserSummary = {
  id: 'admin',
  username: 'Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
  profileImageUrl: null,
  dartsCounterUrl: null,
  isMasterAdmin: true,
};

function installApi(maxLegs: number) {
  const targetLegs = Math.floor(maxLegs / 2) + 1;
  const league = {
    id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2026/27', status: 'OPEN',
    max_legs: maxLegs, points_per_win: 3, points_per_draw: maxLegs % 2 === 0 ? 1 : 0, points_per_loss: 0,
    target_legs: targetLegs, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z', created_by: 'admin',
    max_players: 8, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 0, relegation_places: 0,
  };

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input);
    const method = init?.method ?? 'GET';
    if (path === '/api/admin/seasons' && method === 'GET') return new Response(JSON.stringify({ seasons: [{ id: 's1', name: '2026/27', status: 'OPEN', is_current: 1, created_at: '', updated_at: '', closed_at: null }] }), { status: 200 });
    if (path === '/api/admin/players' && method === 'GET') return new Response(JSON.stringify({ players: [] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/leagues' && method === 'GET') return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/members' && method === 'GET') return new Response(JSON.stringify({ members: [] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1' && method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ league: {
        ...league,
        max_legs: body.maxLegs,
        points_per_win: body.pointsPerWin,
        points_per_draw: body.pointsPerDraw,
        points_per_loss: body.pointsPerLoss,
        target_legs: Math.floor(body.maxLegs / 2) + 1,
      } }), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${method} ${path}`);
  });
}

async function openLeagues(maxLegs: number) {
  const fetchMock = installApi(maxLegs);
  render(<AdminCompetitionDesk user={admin} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
  await screen.findByRole('list', { name: 'Ordered league structure' });
  return fetchMock;
}

describe('admin scoring rules', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('edits Best of 6 with football-style 3-1-0 points and submits the exact rules contract', async () => {
    const fetchMock = await openLeagues(6);

    expect(screen.getByRole('heading', { name: 'Match & table rules' })).toBeTruthy();
    expect(screen.getByText('Best of 6: first to 4 wins; 3-3 is a draw.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Best of'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Points for win'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Points for draw'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Points for loss'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save league' }));

    await screen.findByText('League settings saved.');
    const call = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/competition/leagues/l1' && init?.method === 'PATCH');
    expect(call).toBeTruthy();
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      maxLegs: 6,
      pointsPerWin: 3,
      pointsPerDraw: 1,
      pointsPerLoss: 0,
      matchesPerPair: 1,
    });
    expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty('targetLegs');
  });

  it('explains that an odd Best-of format has no draw', async () => {
    await openLeagues(5);
    await waitFor(() => expect(screen.getByText('Best of 5: first to 3 wins; no draw.')).toBeTruthy());
  });
});
