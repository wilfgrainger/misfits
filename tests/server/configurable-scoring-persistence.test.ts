import { describe, expect, it } from 'vitest';
import { createSeasonLeague, updateSeasonLeague } from '../../src/server/db/competition-leagues';
import { cloneSeasonStructure } from '../../src/server/db/season-lifecycle';

type Season = {
  id: string;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  is_current: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

type League = {
  id: string;
  name: string;
  slug: string;
  season_name: string;
  season_id: string;
  status: 'OPEN' | 'CLOSED';
  points_per_win: number;
  points_per_draw?: number;
  points_per_loss?: number;
  max_legs?: number;
  target_legs: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  max_players: number;
  matches_per_pair: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  hierarchy_position: number;
  promotion_places: number;
  relegation_places: number;
};

class MemoryD1 {
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      run: async () => this.run(sql, []),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO seasons')) {
      const [id, name, status, isCurrent, createdAt, updatedAt, closedAt] = values as [string, string, Season['status'], number, string, string, string | null];
      this.seasons.set(id, { id, name, status, is_current: isCurrent, created_at: createdAt, updated_at: updatedAt, closed_at: closedAt });
    } else if (sql.includes('UPDATE seasons SET is_current = 0')) {
      for (const season of this.seasons.values()) season.is_current = 0;
    } else if (sql.includes('INSERT INTO leagues')) {
      if (sql.includes('max_legs')) {
        const [id, name, slug, seasonName, seasonId, status, win, draw, loss, maxLegs, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, League['status'], number, number, number, number, number, string, string, string, number, number, League['visibility'], number, number, number];
        this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, points_per_win: win, points_per_draw: draw, points_per_loss: loss, max_legs: maxLegs, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });
      } else {
        const [id, name, slug, seasonName, seasonId, status, win, targetLegs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, League['status'], number, number, string, string, string, number, number, League['visibility'], number, number, number];
        this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, points_per_win: win, target_legs: targetLegs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });
      }
    } else if (sql.includes('UPDATE leagues SET') && sql.includes('hierarchy_position')) {
      const id = String(values.at(-1));
      const league = this.leagues.get(id)!;
      if (sql.includes('max_legs')) {
        const [name, slug, win, draw, loss, maxLegs, targetLegs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt] = values as [string, string, number, number, number, number, number, number, number, League['visibility'], number, number, number, string, string];
        Object.assign(league, { name, slug, points_per_win: win, points_per_draw: draw, points_per_loss: loss, max_legs: maxLegs, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });
      } else {
        const [name, slug, win, targetLegs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt] = values as [string, string, number, number, number, number, League['visibility'], number, number, number, string, string];
        Object.assign(league, { name, slug, points_per_win: win, target_legs: targetLegs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });
      }
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM seasons WHERE id')) return (this.seasons.get(String(values[0])) ?? null) as T;
    if (sql.includes('FROM leagues WHERE id = ?')) return (this.leagues.get(String(values[0])) ?? null) as T;
    if (sql.includes('hierarchy_position') && sql.includes('LIMIT 1')) return null;
    if (sql.includes('fixtures') && sql.includes('matches')) return { count: 0 } as T;
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) return { count: 0 } as T;
    return null;
  }

  private async all<T>(sql: string, values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM leagues WHERE season_id')) {
      return { results: [...this.leagues.values()].filter((league) => league.season_id === String(values[0])) as T[] };
    }
    return { results: [] };
  }
}

const now = new Date('2026-08-22T06:00:00.000Z');

function scoringInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Premier', slug: 'premier', maxPlayers: 10, matchesPerPair: 2,
    maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0, targetLegs: 4,
    visibility: 'PUBLIC' as const, hierarchyPosition: 1, promotionPlaces: 0, relegationPlaces: 2,
    ...overrides,
  };
}

describe('durable configurable scoring rules', () => {
  it('round-trips Best-of and win/draw/loss points through season league create and edit', async () => {
    const db = new MemoryD1();
    db.seasons.set('s1', { id: 's1', name: '2026/27', status: 'DRAFT', is_current: 1, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: null });

    const created = await createSeasonLeague(db as never, 'admin', 's1', scoringInput() as never, now) as unknown as League;
    expect(created).toMatchObject({ max_legs: 6, target_legs: 4, points_per_win: 3, points_per_draw: 1, points_per_loss: 0 });

    const edited = await updateSeasonLeague(db as never, 'admin', created.id, scoringInput({ maxLegs: 8, targetLegs: 5, pointsPerWin: 4, pointsPerDraw: 2, pointsPerLoss: 1 }) as never, now) as unknown as League;
    expect(edited).toMatchObject({ max_legs: 8, target_legs: 5, points_per_win: 4, points_per_draw: 2, points_per_loss: 1 });
  });

  it('clones the complete scoring rules instead of reconstructing them from legacy target legs', async () => {
    const db = new MemoryD1();
    db.seasons.set('source', { id: 'source', name: '2026/27', status: 'CLOSED', is_current: 0, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: now.toISOString() });
    db.leagues.set('l1', {
      id: 'l1', name: 'Premier', slug: 'premier', season_name: '2026/27', season_id: 'source', status: 'CLOSED',
      points_per_win: 3, points_per_draw: 1, points_per_loss: 0, max_legs: 6, target_legs: 4,
      created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin', max_players: 10, matches_per_pair: 2,
      visibility: 'PUBLIC', hierarchy_position: 1, promotion_places: 0, relegation_places: 2,
    });

    const cloned = await cloneSeasonStructure(db as never, 'admin', 'source', '2027/28', now);
    expect(cloned.leagues[0]).toMatchObject({ max_legs: 6, target_legs: 4, points_per_win: 3, points_per_draw: 1, points_per_loss: 0 });
  });
});
