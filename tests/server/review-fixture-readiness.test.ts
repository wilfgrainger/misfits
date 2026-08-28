import { describe, expect, it } from 'vitest';
import { commitLeagueFixtures } from '../../src/server/db/competition';

const existingFixture = {
  id: 'fixture-1',
  season_id: 'season-1',
  league_id: 'league-1',
  player_a_id: 'p1',
  player_b_id: 'p2',
  pair_key: 'p1:p2',
  round: 1,
  meeting_number: 1,
  status: 'OUTSTANDING',
  created_at: '2026-08-24T12:00:00.000Z',
  updated_at: '2026-08-24T12:00:00.000Z',
  voided_at: null,
};

class FixtureReadinessDb {
  prepare(sql: string) {
    return {
      bind: (..._values: unknown[]) => ({
        first: async <T>() => {
          if (sql.includes('SELECT COUNT(*) AS count FROM fixtures WHERE league_id')) return { count: 1 } as T;
          if (sql.includes('FROM leagues WHERE id = ?')) return {
            id: 'league-1',
            season_id: 'season-1',
            name: 'Premier',
            matches_per_pair: 1,
          } as T;
          if (sql.includes('AS unassigned_players')) return {
            unassigned_players: 0,
            invalid_players: 1,
            duplicate_placements: 0,
            outstanding_fixtures: 1,
            pending_confirmations: 0,
            disputes: 0,
          } as T;
          return null;
        },
        all: async <T>() => ({
          results: sql.includes('FROM fixtures f') ? [existingFixture as T] : [],
        }),
        run: async () => ({ success: true, meta: { changes: 1 } }),
      }),
    };
  }
}

describe('fixture generation readiness regression', () => {
  it('rejects an idempotent commit when the season has become invalid', async () => {
    const db = new FixtureReadinessDb();

    await expect(commitLeagueFixtures(db as never, 'admin', 'league-1'))
      .rejects.toThrow(/season placement blockers/i);
  });
});
