import { describe, expect, it } from 'vitest';
import {
  calculatePromotionProjection,
  type StandingPosition,
} from '../../src/server/domain/competition';

const standing = (
  userId: string,
  position: number,
  legDifference: number,
  average: number,
): StandingPosition => ({
  userId,
  position,
  points: 12,
  legsFor: 24,
  legDifference,
  average,
  username: userId,
});

describe('ADM-070 deterministic approved tie-break order', () => {
  it('uses standings rank as the sole promotion-boundary authority', () => {
    const standings = new Map<string, StandingPosition[]>([
      ['premier', [standing('p1', 1, 0, 50)]],
      ['division-one', [
        standing('alpha', 1, 9, 72),
        standing('bravo', 1, -6, 38),
        { ...standing('charlie', 3, 3, 60), points: 8, legsFor: 18 },
      ]],
    ]);

    const projection = calculatePromotionProjection(standings, [
      { leagueId: 'premier', hierarchyPosition: 1, promotionPlaces: 0, relegationPlaces: 0 },
      { leagueId: 'division-one', hierarchyPosition: 2, promotionPlaces: 1, relegationPlaces: 0 },
    ]);

    expect(projection.ambiguities).toEqual([
      {
        leagueId: 'division-one',
        boundary: 'PROMOTION',
        position: 1,
        tiedUserIds: ['alpha', 'bravo'],
      },
    ]);
  });
});
