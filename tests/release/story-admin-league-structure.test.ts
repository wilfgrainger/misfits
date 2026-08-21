import { describe, expect, it } from 'vitest';
import { createSeasonLeague, updateSeasonLeague } from '../../src/server/db/competition-leagues';

type Season = { id: string; name: string; status: 'DRAFT' | 'OPEN' | 'CLOSED'; is_current: number; created_at: string; updated_at: string; closed_at: string | null };
type League = {
  id: string; name: string; slug: string; season_name: string; season_id: string | null; status: 'OPEN' | 'CLOSED';
  points_per_win: number; target_legs: number; created_at: string; updated_at: string; created_by: string | null;
  max_players: number; matches_per_pair: number; visibility: 'PUBLIC' | 'PRIVATE'; hierarchy_position: number;
  promotion_places: number; relegation_places: number;
};

class LeagueD1 {
  seasons = new Map<string, Season>();
  leagues = new Map<string, League>();

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('INSERT INTO leagues')) {
      const [id, name, slug, seasonName, seasonId, status, points, legs, createdAt, updatedAt, createdBy, maxPlayers, repeats, visibility, hierarchy, promotion, relegation] = values as [string, string, string, string, string, League['status'], number, number, string, string, string, number, number, League['visibility'], number, number, number];
      this.leagues.set(id, { id, name, slug, season_name: seasonName, season_id: seasonId, status, points_per_win: points, target_legs: legs, created_at: createdAt, updated_at: updatedAt, created_by: createdBy, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation });
    }
    if (sql.includes('UPDATE leagues SET') && sql.includes('hierarchy_position')) {
      const [name, slug, points, legs, maxPlayers, repeats, visibility, hierarchy, promotion, relegation, updatedAt, id] = values as [string, string, number, number, number, number, League['visibility'], number, number, number, string, string];
      const league = this.leagues.get(id)!;
      Object.assign(league, { name, slug, points_per_win: points, target_legs: legs, max_players: maxPlayers, matches_per_pair: repeats, visibility, hierarchy_position: hierarchy, promotion_places: promotion, relegation_places: relegation, updated_at: updatedAt });
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('FROM seasons WHERE id')) return (this.seasons.get(String(values[0])) ?? null) as T | null;
    if (sql.includes('FROM leagues WHERE id')) return (this.leagues.get(String(values[0])) ?? null) as T | null;
    if (sql.includes('hierarchy_position') && sql.includes('FROM leagues')) {
      const seasonId = String(values[0]);
      const hierarchy = Number(values[1]);
      const excludedId = values.length > 2 ? String(values[2]) : null;
      const conflict = [...this.leagues.values()].find((league) => league.season_id === seasonId && league.hierarchy_position === hierarchy && league.id !== excludedId);
      return (conflict ? { id: conflict.id } : null) as T | null;
    }
    if (sql.includes('COUNT(*)') && sql.includes('fixtures') && sql.includes('matches')) return { count: 0 } as T;
    if (sql.includes('COUNT(*)') && sql.includes('league_players')) return { count: 0 } as T;
    return null;
  }
}

const now = new Date('2026-08-21T20:30:00.000Z');
const baseInput = {
  maxPlayers: 8,
  matchesPerPair: 2,
  pointsPerWin: 2,
  targetLegs: 3,
  visibility: 'PRIVATE' as const,
  promotionPlaces: 1,
  relegationPlaces: 1,
};

function setup() {
  const db = new LeagueD1();
  db.seasons.set('s1', { id: 's1', name: '2027/28', status: 'DRAFT', is_current: 1, created_at: now.toISOString(), updated_at: now.toISOString(), closed_at: null });
  return db;
}

describe('ADM-019 to ADM-021 league structure', () => {
  it('creates multiple stable league identities inside one season', async () => {
    const db = setup();
    const premier = await createSeasonLeague(db as never, 'admin', 's1', { ...baseInput, name: 'Premier', slug: 'premier', hierarchyPosition: 1 }, now);
    const divisionOne = await createSeasonLeague(db as never, 'admin', 's1', { ...baseInput, name: 'Division One', slug: 'division-one', hierarchyPosition: 2 }, now);
    expect(premier.id).not.toBe(divisionOne.id);
    expect([premier.season_id, divisionOne.season_id]).toEqual(['s1', 's1']);
  });

  it('renames a league without replacing its identity or competition attachment', async () => {
    const db = setup();
    const created = await createSeasonLeague(db as never, 'admin', 's1', { ...baseInput, name: 'Division 1', slug: 'division-1', hierarchyPosition: 1 }, now);
    const renamed = await updateSeasonLeague(db as never, 'admin', created.id, { ...baseInput, name: 'Division One', slug: created.slug, hierarchyPosition: 1 }, now);
    expect(renamed.id).toBe(created.id);
    expect(renamed.season_id).toBe('s1');
    expect(renamed.name).toBe('Division One');
  });

  it('rejects duplicate hierarchy positions on both create and edit so divisional order is unambiguous', async () => {
    const db = setup();
    const premier = await createSeasonLeague(db as never, 'admin', 's1', { ...baseInput, name: 'Premier', slug: 'premier', hierarchyPosition: 1 }, now);
    const divisionOne = await createSeasonLeague(db as never, 'admin', 's1', { ...baseInput, name: 'Division One', slug: 'division-one', hierarchyPosition: 2 }, now);

    await expect(createSeasonLeague(db as never, 'admin', 's1', { ...baseInput, name: 'Division Two', slug: 'division-two', hierarchyPosition: 1 }, now)).rejects.toMatchObject({ status: 409 });
    await expect(updateSeasonLeague(db as never, 'admin', divisionOne.id, { ...baseInput, name: divisionOne.name, slug: divisionOne.slug, hierarchyPosition: premier.hierarchy_position }, now)).rejects.toMatchObject({ status: 409 });
  });
});
