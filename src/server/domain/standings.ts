import type { LeagueScoringRules } from './scoring';

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
  drawn: number;
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

interface RankedStanding {
  row: Omit<StandingRow, 'rank'>;
  headToHeadPoints: number;
}

function matchPoints(
  playerALegs: number,
  playerBLegs: number,
  rules: LeagueScoringRules,
): readonly [number, number] {
  if (playerALegs === playerBLegs) return [rules.pointsPerDraw, rules.pointsPerDraw];
  return playerALegs > playerBLegs
    ? [rules.pointsPerWin, rules.pointsPerLoss]
    : [rules.pointsPerLoss, rules.pointsPerWin];
}

function headToHeadPoints(
  playerIds: Set<string>,
  matches: ConfirmedMatchInput[],
  rules: LeagueScoringRules,
): Map<string, number> {
  const points = new Map<string, number>();
  for (const playerId of playerIds) points.set(playerId, 0);

  for (const match of matches) {
    if (!playerIds.has(match.playerAId) || !playerIds.has(match.playerBId)) continue;
    const [playerAPoints, playerBPoints] = matchPoints(match.playerALegs, match.playerBLegs, rules);
    points.set(match.playerAId, (points.get(match.playerAId) ?? 0) + playerAPoints);
    points.set(match.playerBId, (points.get(match.playerBId) ?? 0) + playerBPoints);
  }

  return points;
}

function sameCompetitiveRank(left: RankedStanding, right: RankedStanding): boolean {
  return left.row.points === right.row.points
    && left.row.legsFor === right.row.legsFor
    && left.headToHeadPoints === right.headToHeadPoints;
}

export function calculateStandings(
  players: StandingPlayerInput[],
  matches: ConfirmedMatchInput[],
  rules: LeagueScoringRules,
): StandingRow[] {
  const table = new Map<string, MutableStanding>();
  for (const player of players) {
    table.set(player.id, {
      playerId: player.id,
      username: player.username,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      legsFor: 0,
      legsAgainst: 0,
      points: 0,
      averageTotal: 0,
      averageGames: 0,
    });
  }

  for (const match of matches) {
    const a = table.get(match.playerAId);
    const b = table.get(match.playerBId);
    if (!a || !b) continue;

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

    const [playerAPoints, playerBPoints] = matchPoints(match.playerALegs, match.playerBLegs, rules);
    a.points += playerAPoints;
    b.points += playerBPoints;

    if (match.playerALegs === match.playerBLegs) {
      a.drawn += 1;
      b.drawn += 1;
    } else if (match.playerALegs > match.playerBLegs) {
      a.won += 1;
      b.lost += 1;
    } else {
      b.won += 1;
      a.lost += 1;
    }
  }

  const rows: Array<Omit<StandingRow, 'rank'>> = [...table.values()].map((row) => ({
    playerId: row.playerId,
    username: row.username,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    legsFor: row.legsFor,
    legsAgainst: row.legsAgainst,
    legDifference: row.legsFor - row.legsAgainst,
    points: row.points,
    average: row.averageGames ? Math.round((row.averageTotal / row.averageGames) * 100) / 100 : 0,
  }));

  const primaryGroups = new Map<string, Array<Omit<StandingRow, 'rank'>>>();
  for (const row of rows) {
    const key = `${row.points}:${row.legsFor}`;
    const group = primaryGroups.get(key) ?? [];
    group.push(row);
    primaryGroups.set(key, group);
  }

  const ranked: RankedStanding[] = [];
  for (const group of primaryGroups.values()) {
    const ids = new Set(group.map((row) => row.playerId));
    const miniTable = group.length > 1 ? headToHeadPoints(ids, matches, rules) : new Map<string, number>();
    for (const row of group) {
      ranked.push({ row, headToHeadPoints: miniTable.get(row.playerId) ?? 0 });
    }
  }

  ranked.sort((left, right) =>
    right.row.points - left.row.points
    || right.row.legsFor - left.row.legsFor
    || right.headToHeadPoints - left.headToHeadPoints
    || left.row.username.localeCompare(right.row.username)
    || left.row.playerId.localeCompare(right.row.playerId));

  let previous: RankedStanding | undefined;
  let previousRank = 0;
  return ranked.map((standing, index) => {
    const rank = previous && sameCompetitiveRank(previous, standing) ? previousRank : index + 1;
    previous = standing;
    previousRank = rank;
    return { ...standing.row, rank };
  });
}
