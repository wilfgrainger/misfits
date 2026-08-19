import { describe, expect, it } from 'vitest';
import { calculateStandings } from '../../src/server/domain/standings';

describe('standings engine', () => {
  it('calculates played, wins, losses, legs and points including zero-match players', () => {
    const rows = calculateStandings(
      [
        { userId: 'a', username: 'Ace' },
        { userId: 'b', username: 'Bull' },
        { userId: 'c', username: 'Chalk' },
      ],
      [
        { playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 1 },
        { playerAId: 'b', playerBId: 'a', playerALegs: 3, playerBLegs: 2 },
      ],
      2,
    );

    expect(rows.find((row) => row.userId === 'a')).toMatchObject({
      played: 2, won: 1, lost: 1, legsFor: 5, legsAgainst: 4, legDifference: 1, points: 2,
    });
    expect(rows.find((row) => row.userId === 'b')).toMatchObject({
      played: 2, won: 1, lost: 1, legsFor: 4, legsAgainst: 5, legDifference: -1, points: 2,
    });
    expect(rows.find((row) => row.userId === 'c')).toMatchObject({
      played: 0, won: 0, lost: 0, legsFor: 0, legsAgainst: 0, legDifference: 0, points: 0,
    });
  });

  it('orders by points, leg difference, legs for, then case-insensitive username', () => {
    const rows = calculateStandings(
      [
        { userId: 'z', username: 'zulu' },
        { userId: 'a', username: 'Alpha' },
        { userId: 'b', username: 'bravo' },
        { userId: 'c', username: 'Charlie' },
      ],
      [
        { playerAId: 'a', playerBId: 'z', playerALegs: 3, playerBLegs: 2 },
        { playerAId: 'b', playerBId: 'c', playerALegs: 3, playerBLegs: 1 },
      ],
      2,
    );

    expect(rows.map((row) => row.userId)).toEqual(['b', 'a', 'z', 'c']);
  });

  it('uses case-insensitive username as the final tie-breaker', () => {
    const rows = calculateStandings(
      [
        { userId: 'b', username: 'bravo' },
        { userId: 'a', username: 'Alpha' },
      ],
      [],
      2,
    );
    expect(rows.map((row) => row.userId)).toEqual(['a', 'b']);
  });

  it('ignores match rows whose players are not in the active player set', () => {
    const rows = calculateStandings(
      [{ userId: 'a', username: 'Ace' }],
      [{ playerAId: 'a', playerBId: 'retired', playerALegs: 3, playerBLegs: 0 }],
      2,
    );
    expect(rows[0]).toMatchObject({ played: 0, points: 0 });
  });
});
