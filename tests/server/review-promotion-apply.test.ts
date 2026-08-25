import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/server/db/competition', () => ({
  getCompetitionLeague: vi.fn(async () => null),
  getSeason: vi.fn(async (_db: unknown, seasonId: string) => ({
    id: seasonId,
    name: seasonId === 'source' ? '2025/26' : '2026/27',
    status: seasonId === 'source' ? 'CLOSED' : 'DRAFT',
    is_current: seasonId === 'source' ? 0 : 1,
    created_at: '2026-08-24T12:00:00.000Z',
    updated_at: '2026-08-24T12:00:00.000Z',
    closed_at: seasonId === 'source' ? '2026-08-24T12:00:00.000Z' : null,
  })),
  listSeasonLeagues: vi.fn(async (_db: unknown, seasonId: string) => [{
    id: seasonId === 'source' ? 'source-premier' : 'target-premier',
    name: 'Premier',
    season_id: seasonId,
    hierarchy_position: 1,
    promotion_places: 0,
    relegation_places: 0,
    max_players: 8,
  }]),
}));

vi.mock('../../src/server/db/results', () => ({
  getLeagueStandings: vi.fn(async () => [{
    playerId: 'p1',
    username: 'P1',
    rank: 1,
    points: 2,
    legDifference: 3,
    legsFor: 3,
    average: 50,
  }]),
}));

import { applyPromotionProposal } from '../../src/server/db/promotion';

type Movement = {
  id: string;
  from_season_id: string;
  to_season_id: string;
  user_id: string;
  from_league_id: string;
  to_league_id: string;
  from_position: number;
  kind: 'PROMOTED';
  status: 'PROPOSED' | 'APPLIED';
  reason: null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
};

class PromotionApplyDb {
  movement: Movement = {
    id: 'movement-1',
    from_season_id: 'source',
    to_season_id: 'target',
    user_id: 'p1',
    from_league_id: 'source-premier',
    to_league_id: 'target-premier',
    from_position: 1,
    kind: 'PROMOTED',
    status: 'PROPOSED',
    reason: null,
    decided_by: null,
    created_at: '2026-08-24T12:00:00.000Z',
    updated_at: '2026-08-24T12:00:00.000Z',
  };

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => {
          if (sql.includes('COUNT(*) AS count')) return { count: 0 } as T;
          return null;
        },
        all: async <T>() => {
          if (sql.includes('FROM league_players lp') && sql.includes('JOIN users u')) return { results: [] as T[] };
          if (sql.includes('FROM season_movements')) return { results: [this.movement as T] };
          if (sql.includes('FROM league_players') && sql.includes('season_id = ?')) return { results: [] as T[] };
          return { results: [] as T[] };
        },
        run: async () => {
          if (sql.includes('UPDATE season_movements') && sql.includes("status = 'APPLIED'")) {
            this.movement.status = 'APPLIED';
            this.movement.decided_by = String(values[0]);
          }
          return { success: true, meta: { changes: 1 } };
        },
      }),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  }
}

describe('promotion application eligibility regression', () => {
  it('aborts when a proposed participant is no longer eligible', async () => {
    const db = new PromotionApplyDb();

    await expect(applyPromotionProposal(db as never, 'admin', 'source', 'target'))
      .rejects.toThrow(/eligible|participant|competitor/i);
    expect(db.movement.status).toBe('PROPOSED');
  });
});
