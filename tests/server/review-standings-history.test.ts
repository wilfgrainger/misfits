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
    { user_id: 'admin', username: 'Club admin', active: 1, role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED' },
  ]),
}));

vi.mock('../../src/server/db/scoring-rules', () => ({
  scoringRulesForLeague: vi.fn(() => ({ maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 1, pointsPerLoss: 0 })),
}));

import { getLeagueStandings } from '../../src/server/db/results';

const confirmed = {
  id: 'result-1',
  league_id: 'league-1',
  player_a_id: 'p1',
  player_b_id: 'p2',
  player_a_legs: 3,
  player_b_legs: 1,
  player_a_average: 52,
  player_b_average: 48,
  submitted_by: 'p1',
  status: 'CONFIRMED',
  confirmed_by: 'p2',
  dispute_note: null,
  created_at: '2026-08-20T12:00:00.000Z',
  updated_at: '2026-08-20T12:05:00.000Z',
  confirmed_at: '2026-08-20T12:05:00.000Z',
  deleted_at: null,
  player_a_username: 'Suspended player',
  player_b_username: 'Active player',
};

class HistoricalResultsDb {
  prepare(sql: string) {
    return {
      bind: (..._values: unknown[]) => ({
        first: async <T>() => sql.includes('COUNT(*) AS count') ? ({ count: 0 } as T) : null,
        all: async <T>() => ({ results: sql.includes('FROM matches') ? [confirmed as T] : [] }),
      }),
    };
  }
}

describe('historical standings eligibility regression', () => {
  it('keeps confirmed historical competitors without adding a current ineligible non-competitor', async () => {
    const rows = await getLeagueStandings(new HistoricalResultsDb() as never, 'league-1');
    expect(rows.map((row) => row.playerId).sort()).toEqual(['p1', 'p2']);
    expect(rows.find((row) => row.playerId === 'p1')).toMatchObject({ played: 1, won: 1 });
  });
});
