/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StandingsTable } from '../../src/client/components/StandingsTable';

const { mockState, MockApiClient, MockApiClientError } = vi.hoisted(() => {
  const league = {
    id: 'league-1',
    name: 'Misfits 501',
    slug: 'misfits-501',
    seasonName: '2026',
    status: 'OPEN' as const,
    maxLegs: 5,
    pointsPerWin: 2,
    pointsPerDraw: 0,
    pointsPerLoss: 0,
    targetLegs: 3,
    maxPlayers: 16,
    matchesPerPair: 1,
    visibility: 'PUBLIC' as const,
  };
  const user = {
    id: 'admin-1',
    username: 'Admin',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    profileImageUrl: null,
    dartsCounterUrl: null,
    isMasterAdmin: true,
  };
  class ApiClientError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
  }
  class ApiClient {
    me() {
      if (!mockState.user) return Promise.reject(new ApiClientError(401, 'Unauthorized'));
      return Promise.resolve({ user: mockState.user, requiresOnboarding: false });
    }
    leagues() { return Promise.resolve({ leagues: [league] }); }
    myLeagues() { return Promise.resolve({ leagues: [league] }); }
    adminLeagues() { return Promise.resolve({ leagues: [league] }); }
    adminPlayers() { return Promise.resolve({ players: [] }); }
    adminMembers() { return Promise.resolve({ members: [] }); }
    adminInvites() { return Promise.resolve({ invites: [] }); }
    adminResults() { return Promise.resolve({ results: [] }); }
    standings() { return Promise.resolve({ standings: [] }); }
    results() { return Promise.resolve({ results: [] }); }
    publicLeague() { return Promise.resolve({ league, players: [] }); }
    myResults() { return Promise.resolve({ results: [] }); }
  }
  return { mockState: { league, user }, MockApiClient: ApiClient, MockApiClientError: ApiClientError };
});

vi.mock('../../src/client/api', () => ({ ApiClient: MockApiClient, ApiClientError: MockApiClientError }));
vi.mock('../../src/client/auth/GoogleAuth', () => ({ GoogleAuth: class { mountButton() { return Promise.resolve(() => {}); } } }));

import App from '../../src/client/App';

describe('weekly ledger structural contracts', () => {
  beforeEach(() => {
    cleanup();
    mockState.user = null;
  });

  it('preserves the single club logo, public heading, and semantic table in the document', async () => {
    render(<App />);

    const logos = await screen.findAllByRole('img', { name: 'Misfits 501 club seal' });
    expect(logos).toHaveLength(1);

    expect(await screen.findByRole('heading', { level: 1, name: 'The club table' })).toBeTruthy();
  });

  it('renders a fully labelled standings table with tabular data structure', () => {
    render(
      <StandingsTable
        label="Misfits 501 2026 standings"
        standings={[
          { playerId: 'p1', username: 'Player One', rank: 1, played: 3, won: 2, drawn: 1, lost: 0, legsFor: 9, legsAgainst: 4, legDifference: 5, average: 55.4, points: 5 },
          { playerId: 'p2', username: 'Player Two', rank: 2, played: 3, won: 1, drawn: 0, lost: 2, legsFor: 5, legsAgainst: 8, legDifference: -3, average: 48.2, points: 2 },
        ]}
      />
    );

    const table = screen.getByRole('table', { name: 'Misfits 501 2026 standings' });
    expect(table).toBeTruthy();
    for (const heading of ['Pos', 'Player', 'P', 'W-D-L', 'Legs', 'Avg', 'Pts']) {
      expect(within(table).getByRole('columnheader', { name: heading })).toBeTruthy();
    }
    expect(within(table).getByRole('rowheader', { name: 'Player One' })).toBeTruthy();
    expect(within(table).getByRole('cell', { name: '2-1-0' })).toBeTruthy();
    expect(within(table).getByRole('cell', { name: '9' })).toBeTruthy();
    expect(within(table).getByRole('cell', { name: '55.40' })).toBeTruthy();
  });

});
