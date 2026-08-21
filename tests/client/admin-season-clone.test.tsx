/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const admin: UserSummary = {
  id: 'admin-1', username: 'Admin', role: 'ADMIN', status: 'ACTIVE',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true,
};

const sourceSeason = {
  id: 's1', name: '2027/28', status: 'CLOSED', is_current: 1,
  created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', closed_at: '2026-08-21T00:00:00.000Z',
};
const clonedSeason = {
  id: 's2', name: '2028/29', status: 'DRAFT', is_current: 0,
  created_at: '2026-08-21T20:00:00.000Z', updated_at: '2026-08-21T20:00:00.000Z', closed_at: null,
};
const league = {
  id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2027/28', status: 'CLOSED',
  points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', created_by: 'admin-1',
  max_players: 8, matches_per_pair: 2, visibility: 'PRIVATE', hierarchy_position: 1, promotion_places: 0, relegation_places: 1,
};

describe('ADM-018 administrator season cloning', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('copies the selected season structure into a named draft season from the Season workspace', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      if (path === '/api/admin/seasons' && method === 'GET') return new Response(JSON.stringify({ seasons: [sourceSeason] }), { status: 200 });
      if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [] }), { status: 200 });
      if (path === '/api/admin/seasons/s1/leagues' && method === 'GET') return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
      if (path === '/api/admin/seasons/s1/clone' && method === 'POST') {
        return new Response(JSON.stringify({ season: clonedSeason, leagues: [{ ...league, id: 'l2', season_id: 's2', season_name: '2028/29', slug: 'premier-1234' }] }), { status: 201 });
      }
      throw new Error(`Unexpected fetch ${method} ${path}`);
    });

    render(<AdminCompetitionDesk user={admin} />);
    await screen.findByText('2027/28');

    fireEvent.change(screen.getByLabelText('Copy structure into season'), { target: { value: '2028/29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy league structure' }));

    await screen.findByText('Season structure copied.');
    const cloneCall = fetchMock.mock.calls.find(([input, init]) => String(input) === '/api/admin/seasons/s1/clone' && init?.method === 'POST');
    expect(cloneCall).toBeTruthy();
    expect(JSON.parse(String(cloneCall?.[1]?.body))).toEqual({ name: '2028/29' });
    const seasonList = screen.getByRole('list', { name: 'Club seasons' });
    await waitFor(() => expect(within(seasonList).getByText('2028/29')).toBeTruthy());
  });
});
