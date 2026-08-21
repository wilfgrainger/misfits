/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const admin: UserSummary = { id: 'admin', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true };
const season = { id: 's1', name: '2027/28', status: 'OPEN', is_current: 1, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', closed_at: null };
const leagues = [
  { id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2027/28', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', created_by: 'admin', max_players: 8, matches_per_pair: 2, visibility: 'PUBLIC', hierarchy_position: 1, promotion_places: 0, relegation_places: 1 },
  { id: 'l2', season_id: 's1', name: 'Division One', slug: 'division-one', season_name: '2027/28', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', created_by: 'admin', max_players: 10, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 2, promotion_places: 1, relegation_places: 0 },
];

describe('ADM-028 league overview', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows ordered league status, key configuration and active membership count without opening each league', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [season] }), { status: 200 });
      if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [] }), { status: 200 });
      if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues }), { status: 200 });
      if (path === '/api/admin/competition/leagues/l1/members') return new Response(JSON.stringify({ members: [
        { league_id: 'l1', season_id: 's1', user_id: 'u1', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Alpha', profile_image_url: null },
        { league_id: 'l1', season_id: 's1', user_id: 'u2', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Bravo', profile_image_url: null },
      ] }), { status: 200 });
      if (path === '/api/admin/competition/leagues/l2/members') return new Response(JSON.stringify({ members: [
        { league_id: 'l2', season_id: 's1', user_id: 'u3', active: 1, joined_at: '2026-08-01T00:00:00.000Z', username: 'Charlie', profile_image_url: null },
      ] }), { status: 200 });
      throw new Error(`Unexpected fetch ${path}`);
    });

    render(<AdminCompetitionDesk user={admin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
    const structure = await screen.findByRole('list', { name: 'Ordered league structure' });
    const rows = (await within(structure).findAllByRole('button')).map((button) => button.textContent ?? '');

    expect(rows[0]).toContain('1 Premier');
    expect(rows[0]).toContain('OPEN');
    expect(rows[0]).toContain('2/8 active');
    expect(rows[0]).toContain('2× pair');
    expect(rows[1]).toContain('1/10 active');
  });
});
