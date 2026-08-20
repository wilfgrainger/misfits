import { describe, expect, it } from 'vitest';
import { calculateStandings } from '../../src/server/domain/standings';

describe('standings calculation', () => {
  it('aggregates only confirmed games and orders deterministically', () => {
    const rows = calculateStandings([
      { id: 'a', username: 'Alpha' },
      { id: 'b', username: 'Bravo' },
      { id: 'c', username: 'Charlie' },
    ], [
      { playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 1, playerAAverage: 50, playerBAverage: 40 },
      { playerAId: 'b', playerBId: 'c', playerALegs: 3, playerBLegs: 2, playerAAverage: 45, playerBAverage: 44 },
    ], 2);

    expect(rows).toEqual([
      { rank: 1, playerId: 'a', username: 'Alpha', played: 1, won: 1, lost: 0, legsFor: 3, legsAgainst: 1, legDifference: 2, points: 2, average: 50 },
      { rank: 2, playerId: 'b', username: 'Bravo', played: 2, won: 1, lost: 1, legsFor: 4, legsAgainst: 5, legDifference: -1, points: 2, average: 42.5 },
      { rank: 3, playerId: 'c', username: 'Charlie', played: 1, won: 0, lost: 1, legsFor: 2, legsAgainst: 3, legDifference: -1, points: 0, average: 44 },
    ]);
  });
});
