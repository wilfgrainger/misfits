import { describe, expect, it } from 'vitest';
import { getLeagueStandings, updateAdminResult } from '../../src/server/db/results';

type Match = {
  id: string;
  league_id: string;
  fixture_id: string | null;
  player_a_id: string;
  player_b_id: string;
  player_a_legs: number;
  player_b_legs: number;
  player_a_average: number;
  player_b_average: number;
  submitted_by: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPUTED';
  confirmed_by: string | null;
  dispute_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  deleted_at: string | null;
};

const now = new Date('2026-08-21T18:00:00.000Z');

class IntegrityD1 {
  match: Match = {
    id: 'r1', league_id: 'l1', fixture_id: 'f1', player_a_id: 'a', player_b_id: 'b',
    player_a_legs: 2, player_b_legs: 3, player_a_average: 48, player_b_average: 51,
    submitted_by: 'a', status: 'DISPUTED', confirmed_by: null, dispute_note: 'Wrong score',
    created_at: now.toISOString(), updated_at: now.toISOString(), confirmed_at: null, deleted_at: null,
  };
  auditAfter: unknown = null;

  prepare(sql: string) {
    return {
      bind: (...values: unknown[]) => ({
        run: async () => this.run(sql, values),
        first: async <T>() => this.first<T>(sql, values),
        all: async <T>() => this.all<T>(sql, values),
      }),
      first: async <T>() => this.first<T>(sql, []),
      all: async <T>() => this.all<T>(sql, []),
    };
  }

  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  private async run(sql: string, values: unknown[]) {
    if (sql.includes('UPDATE matches SET player_a_id')) {
      const [playerAId, playerBId, playerALegs, playerBLegs, playerAAverage, playerBAverage, status, note, updatedAt, _confirmStatus, confirmedBy, _confirmAtStatus, confirmedAt] = values as [string, string, number, number, number, number, Match['status'], string | null, string, string, string, string, string];
      Object.assign(this.match, {
        player_a_id: playerAId,
        player_b_id: playerBId,
        player_a_legs: playerALegs,
        player_b_legs: playerBLegs,
        player_a_average: playerAAverage,
        player_b_average: playerBAverage,
        status,
        dispute_note: note,
        updated_at: updatedAt,
        confirmed_by: status === 'CONFIRMED' ? confirmedBy : null,
        confirmed_at: status === 'CONFIRMED' ? confirmedAt : null,
      });
    } else if (sql.includes("'RESULT_UPDATED_BY_ADMIN'")) {
      this.auditAfter = JSON.parse(String(values[3]));
    }
    return { success: true, meta: { changes: 1 } };
  }

  private async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    if (sql.includes('SELECT fixture_id FROM matches WHERE id = ?')) {
      return { fixture_id: this.match.fixture_id } as T;
    }
    if (sql.includes('FROM matches') && sql.includes('WHERE matches.id')) {
      return { ...this.match, player_a_username: 'Alpha', player_b_username: 'Bravo' } as T;
    }
    if (sql.includes('FROM leagues WHERE id')) {
      return {
        id: 'l1', name: 'Premier', slug: 'premier', season_name: '2026/27', status: 'OPEN',
        points_per_win: 2, target_legs: 3, max_players: 8, matches_per_pair: 1,
        created_at: now.toISOString(), updated_at: now.toISOString(), created_by: 'admin', visibility: 'PRIVATE',
      } as T;
    }
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      const userId = String(values[1]);
      return { league_id: 'l1', season_id: 's1', user_id: userId, active: 1, joined_at: now.toISOString(), username: userId === 'a' ? 'Alpha' : 'Bravo', profile_image_url: null } as T;
    }
    if (sql.includes('COUNT(*) AS count FROM fixtures')) return { count: 1 } as T;
    return null;
  }

  private async all<T>(sql: string, _values: unknown[]): Promise<{ results: T[] }> {
    if (sql.includes('FROM league_players') && sql.includes('JOIN users')) {
      return { results: [
        { league_id: 'l1', season_id: 's1', user_id: 'a', active: 1, joined_at: now.toISOString(), username: 'Alpha', profile_image_url: null, role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED' },
        { league_id: 'l1', season_id: 's1', user_id: 'b', active: 1, joined_at: now.toISOString(), username: 'Bravo', profile_image_url: null, role: 'PLAYER', status: 'ACTIVE', club_status: 'APPROVED' },
        { league_id: 'l1', season_id: 's1', user_id: 'c', active: 1, joined_at: now.toISOString(), username: 'Captain', profile_image_url: null, role: 'ADMIN', status: 'ACTIVE', club_status: 'APPROVED' },
      ] as T[] };
    }
    if (sql.includes('FROM matches')) {
      const official = { ...this.match, status: 'CONFIRMED' as const, player_a_legs: 3, player_b_legs: 1, player_a_username: 'Alpha', player_b_username: 'Bravo' };
      const freeFloating = {
        ...official, id: 'legacy-free', fixture_id: null, player_a_legs: 3, player_b_legs: 0,
        created_at: '2026-08-20T10:00:00.000Z', updated_at: '2026-08-20T10:00:00.000Z',
      };
      return { results: (sql.includes('JOIN fixtures') ? [official] : [official, freeFloating]) as T[] };
    }
    return { results: [] };
  }
}

describe('admin result integrity', () => {
  it('audits the complete corrected result state, including status and dispute resolution', async () => {
    const db = new IntegrityD1();
    await updateAdminResult(db as never, 'admin', 'r1', {
      playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 1,
      playerAAverage: 52.2, playerBAverage: 47.4, status: 'CONFIRMED', disputeNote: null,
    }, now);

    expect(db.auditAfter).toMatchObject({
      playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 1,
      playerAAverage: 52.2, playerBAverage: 47.4, status: 'CONFIRMED', disputeNote: null,
      confirmedBy: 'admin',
    });
  });

  it('uses only confirmed results tied to fixtures in the selected competition once fixtures exist', async () => {
    const db = new IntegrityD1();
    const standings = await getLeagueStandings(db as never, 'l1');
    expect(standings.find((row) => row.playerId === 'a')).toMatchObject({ played: 1, won: 1, points: 2 });
    expect(standings.find((row) => row.playerId === 'b')).toMatchObject({ played: 1, lost: 1, points: 0 });
    expect(standings.find((row) => row.playerId === 'c')).toMatchObject({ played: 0, points: 0 });
  });
});