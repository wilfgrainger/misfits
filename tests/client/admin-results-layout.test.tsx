/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: () => { throw new Error('legacy Results portal invoked'); },
  };
});

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

function installApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [season] }), { status: 200 });
    if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/members') return new Response(JSON.stringify({ members: [] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/fixtures') return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
    if (path === '/api/admin/leagues/l1/results') return new Response(JSON.stringify({ results: [] }), { status: 200 });
    throw new Error(`Unexpected fetch GET ${path}`);
  });
}

describe('admin results panel integration', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps one canonical Results lifecycle without a portal or duplicate result load', async () => {
    const fetchMock = installApi();
    render(<AdminCompetitionDesk user={admin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Results' }));
    const heading = await screen.findByRole('heading', { name: 'Enter official fixture result' });
    const resultsPanel = heading.closest<HTMLElement>('[role="tabpanel"]');

    expect(resultsPanel).not.toBeNull();
    expect(resultsPanel?.hidden).toBe(false);
    expect(resultsPanel?.closest('.admin-competition-desk')).not.toBeNull();
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === '/api/admin/leagues/l1/results')).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Season' }));
    expect(resultsPanel?.hidden).toBe(true);
  });
});
