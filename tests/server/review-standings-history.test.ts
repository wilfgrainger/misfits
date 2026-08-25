import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/server/db/leagues', () => ({
  getLeagueById: vi.fn(async () => ({
    id: 'league-1',
    name: 'Premier',
    status: 'CLOSED',
    max_legs: 5,
    points_per_win: 2,
    points_per_draw: 1,
    points_per_loss: 0,
    target_legs: 3,
    matches_per_pair: 1,
  })),
  getMembership: vi.fn(async () => null),
  listLeagueMembers: vi.fn(async () => [
    { user_id: 'p1', username: 'Suspended player', active: 1, role: 'PLAYER', status: 'SUSPENDED', club_status: 'APPROVED' },
    { user_id: 'p2', username: 'Active player', active: 1, role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED' },
  ]),
}));

vi.mock('../../src/server/db/scoring-rules', () => ({
  scoringRulesForLeague: vi.fn(() => ({ maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 1, pointsPerLoss: 0 })),
}));

import { getLeagueStandings } from '../../src/server/db/results';

class EmptyResultsDb {
  prepare(sql: string) {
    return {
      bind: (..._values: unknown[]) => ({
        first: async <T>() => sql.includes('COUNT(*) AS count') ? ({ count: 0 } as T) : null,
        all: async <T>() => ({ results: [] as T[] }),
      }),
    };
  }
}

describe('historical standings eligibility regression', () => {
  it('keeps an existing competitor in standings after their account is suspended', async () => {
    const rows = await getLeagueStandings(new EmptyResultsDb() as never, 'league-1');
    expect(rows.map((row) => row.playerId).sort()).toEqual(['p1', 'p2']);
  });
});
