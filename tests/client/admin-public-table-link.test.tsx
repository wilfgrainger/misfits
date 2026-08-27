/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const admin: UserSummary = { id: 'admin', username: 'Admin', role: 'ADMIN', status: 'ACTIVE', profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true };
const season = { id: 's1', name: '2027/28', status: 'OPEN', is_current: 1, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', closed_at: null };
const leagues = [
  { id: 'l1', season_id: 's1', name: 'Premier', slug: 'premier', season_name: '2027/28', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', created_by: 'admin', max_players: 8, matches_per_pair: 2, visibility: 'PUBLIC', hierarchy_position: 1, promotion_places: 0, relegation_places: 1 },
  { id: 'l2', season_id: 's1', name: 'Division One', slug: 'division-one', season_name: '2027/28', status: 'OPEN', points_per_win: 2, target_legs: 3, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z', created_by: 'admin', max_players: 10, matches_per_pair: 1, visibility: 'PRIVATE', hierarchy_position: 2, promotion_places: 1, relegation_places: 0 },
];

function mockDesk() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [season] }), { status: 200 });
    if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [] }), { status: 200 });
    if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues }), { status: 200 });
    if (path.startsWith('/api/admin/competition/leagues/')) return new Response(JSON.stringify({ members: [] }), { status: 200 });
    throw new Error(`Unexpected fetch ${path}`);
  });
}

async function openLeague(name: string) {
  render(<AdminCompetitionDesk user={admin} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Leagues' }));
  const structure = await screen.findByRole('list', { name: 'Ordered league structure' });
  const row = (await within(structure).findAllByRole('button')).find((button) => button.textContent?.includes(name));
  if (!row) throw new Error(`No league row for ${name}`);
  fireEvent.click(row);
  return screen.findByRole('heading', { name: `Edit ${name}` });
}

describe('deliberately public club table', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('gives an admin the shareable public table address for a public league', async () => {
    mockDesk();
    await openLeague('Premier');

    const link = await screen.findByRole('link', { name: 'Open the public Premier table' });
    expect(link.getAttribute('href')).toBe('/league/premier');
    expect(screen.getByText(`${window.location.origin}/league/premier`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share public table link' })).toBeTruthy();
  });

  it('never offers a public address for a private league', async () => {
    mockDesk();
    await openLeague('Division One');

    expect(screen.queryByRole('link', { name: /Open the public/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share public table link' })).toBeNull();
    expect(screen.queryByText(/\/league\/division-one/)).toBeNull();
  });

  it('copies the public table address when native sharing is unavailable', async () => {
    mockDesk();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await openLeague('Premier');

    fireEvent.click(await screen.findByRole('button', { name: 'Share public table link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/league/premier`));
    expect(await screen.findByText('Public table link copied.')).toBeTruthy();
  });
});
