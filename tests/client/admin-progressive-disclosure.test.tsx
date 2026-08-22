/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function installApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [season] }), { status: 200 });
    if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues: [league] }), { status: 200 });
    if (path === '/api/admin/competition/leagues/l1/members') return new Response(JSON.stringify({ members: [] }), { status: 200 });
    throw new Error(`Unexpected fetch GET ${path}`);
  });
}

describe('admin progressive disclosure', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    installApi();
  });

  it('keeps selected settings visible while secondary season and league setup stays collapsed', async () => {
    render(<AdminCompetitionDesk user={admin} />);

    expect(await screen.findByRole('heading', { name: 'Season settings' })).toBeTruthy();
    const seasonSummary = screen.getByText('Create or copy season');
    const seasonDisclosure = seasonSummary.closest('details');
    expect(seasonDisclosure).not.toBeNull();
    expect(seasonDisclosure?.open).toBe(false);
    expect(seasonDisclosure?.contains(screen.getByRole('button', { name: 'Create season', hidden: true }))).toBe(true);
    expect(seasonDisclosure?.contains(screen.getByRole('button', { name: 'Copy league structure', hidden: true }))).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: 'Leagues' }));
    expect(await screen.findByRole('heading', { name: 'Edit Premier' })).toBeTruthy();
    const leagueSummary = screen.getByText('Add or remove league');
    const leagueDisclosure = leagueSummary.closest('details');
    expect(leagueDisclosure).not.toBeNull();
    expect(leagueDisclosure?.open).toBe(false);
    expect(leagueDisclosure?.contains(screen.getByRole('button', { name: 'Create league', hidden: true }))).toBe(true);
    expect(leagueDisclosure?.contains(screen.getByRole('button', { name: 'Delete empty league', hidden: true }))).toBe(true);
  });
});
