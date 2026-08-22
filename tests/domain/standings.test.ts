import { describe, expect, it } from 'vitest';
import { calculateStandings } from '../../src/server/domain/standings';
import type { LeagueScoringRules } from '../../src/server/domain/scoring';

const legacyRules: LeagueScoringRules = { maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0 };
const drawRules: LeagueScoringRules = { maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0 };

function standings(
  players: Array<{ id: string; username: string }>,
  matches: Array<{ playerAId: string; playerBId: string; playerALegs: number; playerBLegs: number; playerAAverage: number; playerBAverage: number }>,
  rules: LeagueScoringRules,
) {
  // Keep the RED suite executable against the legacy numeric API until GREEN changes the contract.
  return calculateStandings(players, matches, rules as never);
}

const match = (
  playerAId: string,
  playerBId: string,
  playerALegs: number,
  playerBLegs: number,
  playerAAverage = 50,
  playerBAverage = 45,
) => ({ playerAId, playerBId, playerALegs, playerBLegs, playerAAverage, playerBAverage });

describe('standings calculation', () => {
  it('applies configurable win draw and loss points and records W-D-L totals', () => {
    const rules: LeagueScoringRules = { maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 2, pointsPerLoss: 1 };
    const rows = standings([
      { id: 'a', username: 'Alpha' },
      { id: 'b', username: 'Bravo' },
      { id: 'c', username: 'Charlie' },
    ], [
      match('a', 'b', 3, 3),
      match('a', 'c', 4, 1),
    ], rules);

    expect(rows.find((row) => row.playerId === 'a')).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, points: 5 });
    expect(rows.find((row) => row.playerId === 'b')).toMatchObject({ played: 1, won: 0, drawn: 1, lost: 0, points: 2 });
    expect(rows.find((row) => row.playerId === 'c')).toMatchObject({ played: 1, won: 0, drawn: 0, lost: 1, points: 1 });
  });

  it('uses total legs won before head-to-head when league points are equal', () => {
    const rows = standings([
      { id: 'a', username: 'Alpha' },
      { id: 'b', username: 'Bravo' },
      { id: 'c', username: 'Charlie' },
    ], [
      match('b', 'a', 3, 2),
      match('a', 'c', 3, 2),
    ], legacyRules);

    // A and B both have two points, but A has five total legs won versus B's three.
    // The legacy sorter incorrectly favours B's leg difference before looking at legs won.
    expect(rows.slice(0, 2).map((row) => row.playerId)).toEqual(['a', 'b']);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });

  it('uses two-player head-to-head points after league points and legs won are equal', () => {
    const rows = standings([
      { id: 'd', username: 'Delta' },
      { id: 'a', username: 'Alpha' },
      { id: 'b', username: 'Bravo' },
      { id: 'c', username: 'Charlie' },
      { id: 'e', username: 'Echo' },
    ], [
      match('a', 'b', 3, 0, 40, 60),
      match('b', 'c', 3, 0, 60, 45),
      match('d', 'a', 3, 0, 50, 40),
      match('d', 'e', 3, 0, 50, 45),
    ], legacyRules);

    // A and B both finish on two points, three legs won and zero leg difference.
    // Legacy average would put B first, but A won their confirmed head-to-head.
    expect(rows.filter((row) => row.playerId === 'a' || row.playerId === 'b').map((row) => ({ playerId: row.playerId, rank: row.rank }))).toEqual([
      { playerId: 'a', rank: 2 },
      { playerId: 'b', rank: 3 },
    ]);
  });

  it('uses a mini-table of only tied-player matches for a three-player head-to-head group', () => {
    const rows = standings([
      { id: 'a', username: 'Alpha' },
      { id: 'b', username: 'Bravo' },
      { id: 'c', username: 'Charlie' },
      { id: 'd', username: 'Delta' },
      { id: 'e', username: 'Echo' },
      { id: 'f', username: 'Foxtrot' },
      { id: 'g', username: 'Golf' },
      { id: 'h', username: 'Hotel' },
    ], [
      match('a', 'b', 3, 0, 30, 50),
      match('a', 'c', 3, 0, 30, 70),
      match('b', 'c', 3, 0, 50, 70),
      match('b', 'd', 3, 0, 50, 45),
      match('c', 'd', 3, 0, 70, 45),
      match('c', 'e', 3, 0, 70, 45),
      match('f', 'a', 3, 0, 55, 30),
      match('f', 'a', 3, 0, 55, 30),
      match('f', 'h', 3, 0, 55, 45),
      match('g', 'b', 3, 0, 55, 50),
    ], legacyRules);

    // A, B and C all finish on four league points, six total legs won and zero leg difference.
    // Their mini-table points are A=4, B=2, C=0. Legacy average would rank them C, B, A.
    expect(rows.filter((row) => ['a', 'b', 'c'].includes(row.playerId)).map((row) => ({ playerId: row.playerId, rank: row.rank }))).toEqual([
      { playerId: 'a', rank: 2 },
      { playerId: 'b', rank: 3 },
      { playerId: 'c', rank: 4 },
    ]);
  });

  it('gives unresolved equal competitors the same rank and uses username only for stable display', () => {
    const rows = standings([
      { id: 'b', username: 'Bravo' },
      { id: 'a', username: 'Alpha' },
      { id: 'c', username: 'Charlie' },
    ], [
      match('a', 'b', 3, 3),
    ], drawRules);

    expect(rows.map((row) => ({ playerId: row.playerId, rank: row.rank }))).toEqual([
      { playerId: 'a', rank: 1 },
      { playerId: 'b', rank: 1 },
      { playerId: 'c', rank: 3 },
    ]);
  });

  it('retains derived averages and leg difference for presentation without using them as tie-breakers', () => {
    const rows = standings([
      { id: 'a', username: 'Alpha' },
      { id: 'b', username: 'Bravo' },
      { id: 'c', username: 'Charlie' },
    ], [
      { playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 1, playerAAverage: 50, playerBAverage: 40 },
      { playerAId: 'b', playerBId: 'c', playerALegs: 3, playerBLegs: 2, playerAAverage: 45, playerBAverage: 44 },
    ], legacyRules);

    expect(rows.find((row) => row.playerId === 'b')).toMatchObject({
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      legsFor: 4,
      legsAgainst: 5,
      legDifference: -1,
      points: 2,
      average: 42.5,
    });
  });
});
