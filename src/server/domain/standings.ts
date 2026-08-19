export interface StandingPlayer {
  userId: string;
  username: string;
}

export interface ConfirmedMatch {
  playerAId: string;
  playerBId: string;
  playerALegs: number;
  playerBLegs: number;
}

export interface StandingRow {
  userId: string;
  username: string;
  played: number;
  won: number;
  lost: number;
  legsFor: number;
  legsAgainst: number;
  legDifference: number;
  points: number;
}

export function calculateStandings(
  players: StandingPlayer[],
  matches: ConfirmedMatch[],
  pointsPerWin: number,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const player of players) {
    rows.set(player.userId, {
      userId: player.userId,
      username: player.username,
      played: 0,
      won: 0,
      lost: 0,
      legsFor: 0,
      legsAgainst: 0,
      legDifference: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    const a = rows.get(match.playerAId);
    const b = rows.get(match.playerBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.legsFor += match.playerALegs;
    a.legsAgainst += match.playerBLegs;
    b.legsFor += match.playerBLegs;
    b.legsAgainst += match.playerALegs;

    if (match.playerALegs > match.playerBLegs) {
      a.won += 1;
      b.lost += 1;
    } else {
      b.won += 1;
      a.lost += 1;
    }
  }

  for (const row of rows.values()) {
    row.legDifference = row.legsFor - row.legsAgainst;
    row.points = row.won * pointsPerWin;
  }

  return [...rows.values()].sort((a, b) =>
    b.points - a.points
    || b.legDifference - a.legDifference
    || b.legsFor - a.legsFor
    || a.username.toLocaleLowerCase('en-GB').localeCompare(b.username.toLocaleLowerCase('en-GB'), 'en-GB')
    || a.userId.localeCompare(b.userId),
  );
}
