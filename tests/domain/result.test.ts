import { describe, expect, it } from 'vitest';
import { canonicalPair, validatePlayerResult } from '../../src/server/domain/result';
import type { LeagueScoringRules } from '../../src/server/domain/scoring';

const bestOf5: LeagueScoringRules = { maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0 };
const bestOf6: LeagueScoringRules = { maxLegs: 6, pointsPerWin: 3, pointsPerDraw: 1, pointsPerLoss: 0 };

function validate(input: unknown, rules: LeagueScoringRules) {
  return validatePlayerResult(input, rules);
}

function result(playerALegs: number, playerBLegs: number) {
  return {
    playerAId: 'player-a',
    playerBId: 'player-b',
    playerALegs,
    playerBLegs,
    playerAAverage: 51.236,
    playerBAverage: 47.1,
  };
}

describe('result rules', () => {
  it('canonicalizes an unordered player pair', () => {
    expect(canonicalPair('player-b', 'player-a')).toEqual(['player-a', 'player-b']);
  });

  it.each([
    [3, 0],
    [3, 1],
    [3, 2],
  ])('accepts Best of 5 decisive score %i-%i', (playerALegs, playerBLegs) => {
    expect(validate(result(playerALegs, playerBLegs), bestOf5)).toMatchObject({
      ok: true,
      value: { playerALegs, playerBLegs },
    });
  });

  it.each([
    [2, 2],
    [3, 3],
    [2, 1],
  ])('rejects invalid Best of 5 score %i-%i', (playerALegs, playerBLegs) => {
    expect(validate(result(playerALegs, playerBLegs), bestOf5)).toEqual({ ok: false, reason: 'SCORE' });
  });

  it.each([
    [4, 0],
    [4, 1],
    [4, 2],
    [3, 3],
  ])('accepts Best of 6 completed score %i-%i', (playerALegs, playerBLegs) => {
    expect(validate(result(playerALegs, playerBLegs), bestOf6)).toMatchObject({
      ok: true,
      value: { playerALegs, playerBLegs },
    });
  });

  it.each([
    [3, 2],
    [4, 3],
    [4, 4],
    [5, 1],
  ])('rejects invalid Best of 6 score %i-%i', (playerALegs, playerBLegs) => {
    expect(validate(result(playerALegs, playerBLegs), bestOf6)).toEqual({ ok: false, reason: 'SCORE' });
  });

  it('rounds both averages for a valid result', () => {
    expect(validate(result(3, 1), bestOf5)).toEqual({
      ok: true,
      value: {
        playerAId: 'player-a',
        playerBId: 'player-b',
        playerALegs: 3,
        playerBLegs: 1,
        playerAAverage: 51.24,
        playerBAverage: 47.1,
      },
    });
  });

  it.each([
    [{ playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 0, playerAAverage: 201, playerBAverage: 50 }, 'AVERAGE'],
    [{ playerAId: 'a', playerBId: 'a', playerALegs: 3, playerBLegs: 0, playerAAverage: 50, playerBAverage: 50 }, 'PLAYERS'],
  ] as const)('rejects invalid non-score result input', (input, reason) => {
    expect(validate(input, bestOf5)).toEqual({ ok: false, reason });
  });
});
