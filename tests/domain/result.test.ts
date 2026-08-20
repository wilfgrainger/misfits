import { describe, expect, it } from 'vitest';
import { canonicalPair, validatePlayerResult } from '../../src/server/domain/result';

describe('result rules', () => {
  it('canonicalizes an unordered player pair', () => {
    expect(canonicalPair('player-b', 'player-a')).toEqual(['player-a', 'player-b']);
  });

  it('requires a decisive target-legs result and rounds both averages', () => {
    expect(validatePlayerResult({ playerAId: 'player-a', playerBId: 'player-b', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.236, playerBAverage: 47.1 }, 3)).toEqual({
      ok: true,
      value: { playerAId: 'player-a', playerBId: 'player-b', playerALegs: 3, playerBLegs: 1, playerAAverage: 51.24, playerBAverage: 47.1 },
    });
  });

  it.each([
    [{ playerAId: 'a', playerBId: 'b', playerALegs: 2, playerBLegs: 2, playerAAverage: 50, playerBAverage: 50 }, 'SCORE'],
    [{ playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 3, playerAAverage: 50, playerBAverage: 50 }, 'SCORE'],
    [{ playerAId: 'a', playerBId: 'b', playerALegs: 3, playerBLegs: 0, playerAAverage: 201, playerBAverage: 50 }, 'AVERAGE'],
    [{ playerAId: 'a', playerBId: 'a', playerALegs: 3, playerBLegs: 0, playerAAverage: 50, playerBAverage: 50 }, 'PLAYERS'],
  ] as const)('rejects invalid result input', (input, reason) => {
    expect(validatePlayerResult(input, 3)).toEqual({ ok: false, reason });
  });
});
