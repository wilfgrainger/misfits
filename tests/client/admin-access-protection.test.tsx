/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminCompetitionDesk } from '../../src/client/components/AdminCompetitionDesk';
import type { UserSummary } from '../../src/client/api';

const currentAdmin: UserSummary = {
  id: 'admin-2', username: 'Second Admin', role: 'ADMIN', status: 'ACTIVE',
  profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
};

describe('ADM-009 master administrator UI protection', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows a protected master administrator but does not offer destructive role/status controls', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path === '/api/admin/seasons') return new Response(JSON.stringify({ seasons: [] }), { status: 200 });
      if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [
        {
          id: 'master-1', email: 'master@example.com', username: 'Master Admin', role: 'ADMIN', status: 'ACTIVE', leagueActive: false,
          profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: true,
        },
        {
          id: 'admin-2', email: 'admin2@example.com', username: 'Second Admin', role: 'ADMIN', status: 'ACTIVE', leagueActive: false,
          profileImageUrl: null, dartsCounterUrl: null, isMasterAdmin: false,
        },
      ] }), { status: 200 });
      throw new Error(`Unexpected fetch ${path}`);
    });

    render(<AdminCompetitionDesk user={currentAdmin} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Club access' }));
    await waitFor(() => expect(screen.getByText(/master@example\.com/)).toBeTruthy());

    expect(screen.getByText(/Protected master administrator/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove Master Admin admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Suspend Master Admin' })).toBeNull();
  });
});
