export interface StandingPlayerInput {
  id: string;
  username: string;
}

export interface ConfirmedMatchInput {
  playerAId: string;
  playerBId: string;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
}

export interface StandingRow {
  rank: number;
  playerId: string;
  username: string;
  played: number;
  won: number;
  lost: number;
  legsFor: number;
  legsAgainst: number;
  legDifference: number;
  points: number;
  average: number;
}

interface MutableStanding extends Omit<StandingRow, 'rank' | 'legDifference' | 'average'> {
  averageTotal: number;
  averageGames: number;
}

export function calculateStandings(players: StandingPlayerInput[], matches: ConfirmedMatchInput[], pointsPerWin: number): StandingRow[] {
  const table = new Map<string, MutableStanding>();
  for (const player of players) {
    table.set(player.id, { playerId: player.id, username: player.username, played: 0, won: 0, lost: 0, legsFor: 0, legsAgainst: 0, points: 0, averageTotal: 0, averageGames: 0 });
  }
  for (const match of matches) {
    const a = table.get(match.playerAId);
    const b = table.get(match.playerBId);
    if (!a || !b) continue;
    const aWon = match.playerALegs > match.playerBLegs;
    a.played += 1;
    b.played += 1;
    a.legsFor += match.playerALegs;
    a.legsAgainst += match.playerBLegs;
    b.legsFor += match.playerBLegs;
    b.legsAgainst += match.playerALegs;
    a.averageTotal += match.playerAAverage;
    b.averageTotal += match.playerBAverage;
    a.averageGames += 1;
    b.averageGames += 1;
    if (aWon) {
      a.won += 1;
      a.points += pointsPerWin;
      b.lost += 1;
    } else {
      b.won += 1;
      b.points += pointsPerWin;
      a.lost += 1;
    }
  }
  const rows = [...table.values()].map((row) => ({
    rank: 0,
    playerId: row.playerId,
    username: row.username,
    played: row.played,
    won: row.won,
    lost: row.lost,
    legsFor: row.legsFor,
    legsAgainst: row.legsAgainst,
    legDifference: row.legsFor - row.legsAgainst,
    points: row.points,
    average: row.averageGames ? Math.round((row.averageTotal / row.averageGames) * 100) / 100 : 0,
  }));
  rows.sort((left, right) => right.points - left.points || right.legDifference - left.legDifference || right.legsFor - left.legsFor || right.average - left.average || left.username.localeCompare(right.username));
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
