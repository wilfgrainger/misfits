import { describe, expect, it } from 'vitest';
import { updateLeague } from '../../src/server/db/leagues';

type League = {
  id: string; name: string; slug: string; season_name: string; status: 'OPEN' | 'CLOSED';
  points_per_win: number; points_per_draw: number; points_per_loss: number; max_legs: number; target_legs: number;
  created_at: string; updated_at: string; created_by: string | null; max_players: number; matches_per_pair: number; visibility: 'PUBLIC' | 'PRIVATE';
};

class RulesD1 {
  league: League = {
    id: 'l1', name: 'Premier', slug: 'premier', season_name: '2027/28', status: 'OPEN',
    points_per_win: 3, points_per_draw: 1, points_per_loss: 0, max_legs: 6, target_legs: 4,
    created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', created_by: 'admin', max_players: 8, matches_per_pair: 2, visibility: 'PRIVATE',
  };
  competitionRows = 1;

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async <T>() => this.first<T>(sql, values),
        run: async () => this.run(sql, values),
      }),
    };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM leagues WHERE id')) return (String(values[0]) === this.league.id ? this.league : null) as T | null;
    if (sql.includes('fixtures') && sql.includes('matches')) return { count: this.competitionRows } as T;
    return null;
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('UPDATE leagues') && sql.includes('points_per_win')) {
      if (sql.includes('max_legs')) {
        const [name, slug, seasonName, status, win, draw, loss, maxLegs, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt] = values as [string, string, string, League['status'], number, number, number, number, number, number, number, League['visibility'], string];
        Object.assign(this.league, { name, slug, season_name: seasonName, status, points_per_win: win, points_per_draw: draw, points_per_loss: loss, max_legs: maxLegs, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility, updated_at: updatedAt });
      } else {
        const [name, slug, seasonName, status, points, targetLegs, maxPlayers, matchesPerPair, visibility, updatedAt] = values as [string, string, string, League['status'], number, number, number, number, League['visibility'], string];
        Object.assign(this.league, { name, slug, season_name: seasonName, status, points_per_win: points, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: matchesPerPair, visibility, updated_at: updatedAt });
      }
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 1 } };
  }
}

const baseInput = {
  name: 'Premier', slug: 'premier', seasonName: '2027/28', status: 'OPEN' as const,
  maxLegs: 6, targetLegs: 4, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0,
  maxPlayers: 8, matchesPerPair: 2, visibility: 'PRIVATE' as const,
};

describe('ADM-030 protect competition rules after play begins', () => {
  it.each([
    ['maxLegs', 8],
    ['pointsPerWin', 4],
    ['pointsPerDraw', 2],
    ['pointsPerLoss', 1],
    ['matchesPerPair', 3],
  ] as const)('blocks a %s change when fixtures/results exist', async (field, value) => {
    const db = new RulesD1();
    await expect(updateLeague(db as never, 'admin', 'l1', { ...baseInput, [field]: value }, new Date('2026-08-21T20:40:00.000Z'))).rejects.toMatchObject({ status: 409 });
  });

  it('still permits non-interpretive metadata changes', async () => {
    const db = new RulesD1();
    const renamed = await updateLeague(db as never, 'admin', 'l1', { ...baseInput, name: 'Premier Division' }, new Date('2026-08-21T20:41:00.000Z'));
    expect(renamed).toMatchObject({
      id: 'l1', name: 'Premier Division', max_legs: 6, target_legs: 4,
      points_per_win: 3, points_per_draw: 1, points_per_loss: 0, matches_per_pair: 2,
    });
  });
});
