/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('administrator load failure recovery', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('lets an administrator retry the initial competition workspace load', async () => {
    let failInitialLoad = true;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path === '/api/admin/seasons') {
        if (failInitialLoad) return new Response(JSON.stringify({ error: { message: 'Competition administration is temporarily unavailable' } }), { status: 503 });
        return new Response(JSON.stringify({ seasons: [season] }), { status: 200 });
      }
      if (path === '/api/admin/players') return new Response(JSON.stringify({ players: [] }), { status: 200 });
      if (path === '/api/admin/seasons/s1/leagues') return new Response(JSON.stringify({ leagues: [] }), { status: 200 });
      throw new Error(`Unexpected fetch ${path}`);
    });

    render(<AdminCompetitionDesk user={admin} />);

    const retry = await screen.findByRole('button', { name: 'Try loading this again' });
    expect(screen.getByRole('alert').textContent).toContain('Competition administration is temporarily unavailable');

    failInitialLoad = false;
    fireEvent.click(retry);

    expect(await screen.findByText('2026/27')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Try loading this again' })).toBeNull());
    expect(screen.getByRole('heading', { name: 'Competition admin' })).toBeTruthy();
  });
});
