import { describe, expect, it } from 'vitest';
import { validatePlayerScore } from '../../src/server/domain/matches';

describe('player score validation', () => {
  it.each([
    [3, 0], [3, 1], [3, 2], [0, 3], [1, 3], [2, 3],
  ])('accepts a valid race-to-three score %i-%i', (a, b) => {
    expect(validatePlayerScore(a, b, 3)).toEqual({ ok: true });
  });

  it.each([
    [0, 0], [2, 2], [3, 3],
  ])('rejects draws %i-%i', (a, b) => {
    expect(validatePlayerScore(a, b, 3).ok).toBe(false);
  });

  it.each([
    [-1, 3], [3, -1], [1.5, 3], [3, 2.5], [2, 1], [4, 2], [2, 4],
  ])('rejects impossible score %s-%s', (a, b) => {
    expect(validatePlayerScore(a, b, 3).ok).toBe(false);
  });
});
