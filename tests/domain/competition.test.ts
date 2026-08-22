import { describe, expect, it } from 'vitest';
import {
  calculatePromotionProjection,
  generateRoundRobinFixtures,
  movementZones,
  validateSeasonInput,
  type StandingPosition,
} from '../../src/server/domain/competition';

describe('competition rules', () => {
  it.each([
    [8, 1, 28],
    [10, 1, 45],
    [10, 2, 90],
    [12, 1, 66],
  ])('generates the expected round-robin count for %i players x%i', (playerCount, repeats, expected) => {
    const players = Array.from({ length: playerCount }, (_, index) => `p${index + 1}`);
    const fixtures = generateRoundRobinFixtures(players, repeats);
    expect(fixtures).toHaveLength(expected);
    expect(fixtures.every((fixture) => fixture.playerAId !== fixture.playerBId)).toBe(true);
    expect(new Set(fixtures.map((fixture) => `${fixture.meetingNumber}:${[fixture.playerAId, fixture.playerBId].sort().join(':')}`)).size).toBe(expected);
  });

  it('uses stable deterministic rounds and gives each player at most one fixture in a round', () => {
    const players = ['a', 'b', 'c', 'd', 'e'];
    const fixtures = generateRoundRobinFixtures(players, 1);
    expect(generateRoundRobinFixtures(players, 1)).toEqual(fixtures);
    const byRound = Map.groupBy(fixtures, (fixture) => fixture.round);
    expect(fixtures).toHaveLength(10);
    expect(byRound.size).toBe(5);
    for (const round of byRound.values()) {
      const roundPlayers = round.flatMap((fixture) => [fixture.playerAId, fixture.playerBId]);
      expect(new Set(roundPlayers).size).toBe(roundPlayers.length);
    }
  });

  it('distinguishes repeat meetings while preserving the same unordered pairing', () => {
    const fixtures = generateRoundRobinFixtures(['a', 'b', 'c', 'd'], 2);
    const pair = fixtures.filter((fixture) => new Set([fixture.playerAId, fixture.playerBId]).has('a') && new Set([fixture.playerAId, fixture.playerBId]).has('b'));
    expect(pair).toHaveLength(2);
    expect(pair.map((fixture) => fixture.meetingNumber).sort()).toEqual([1, 2]);
    expect(pair[0].round).not.toBe(pair[1].round);
  });

  it('calculates promotion and relegation zones without overlapping', () => {
    expect(movementZones(10, 2, 2)).toEqual({ promotion: [1, 2], relegation: [9, 10] });
    expect(movementZones(4, 0, 2)).toEqual({ promotion: [], relegation: [3, 4] });
    expect(() => movementZones(4, 3, 2)).toThrow(/overlap/i);
  });

  it('validates durable season identity separately from display state', () => {
    expect(validateSeasonInput({ name: '2026/27', status: 'DRAFT', isCurrent: true })).toEqual({
      ok: true,
      value: { name: '2026/27', status: 'DRAFT', isCurrent: true },
    });
    expect(validateSeasonInput({ name: '', status: 'OPEN' })).toEqual({ ok: false, reason: 'NAME' });
    expect(validateSeasonInput({ name: '2026/27', status: 'BOGUS' })).toEqual({ ok: false, reason: 'STATUS' });
  });
});

describe('promotion rank authority', () => {
  const row = (
    userId: string,
    position: number,
    overrides: Partial<Omit<StandingPosition, 'userId' | 'position'>> = {},
  ): StandingPosition => ({
    userId,
    position,
    points: 10,
    legDifference: 0,
    legsFor: 20,
    average: 50,
    username: userId.toUpperCase(),
    ...overrides,
  });

  const leagues = [
    { leagueId: 'prem', hierarchyPosition: 1, promotionPlaces: 0, relegationPlaces: 0 },
    { leagueId: 'div1', hierarchyPosition: 2, promotionPlaces: 1, relegationPlaces: 0 },
  ];

  it('does not invent a promotion ambiguity when authoritative standings ranks are different', () => {
    const standings = new Map<string, StandingPosition[]>([
      ['prem', [row('p1', 1)]],
      ['div1', [
        row('a', 1),
        row('b', 2),
        row('c', 3, { points: 8, legsFor: 18 }),
      ]],
    ]);

    // A and B deliberately have identical legacy raw metrics. Their distinct
    // standings ranks represent an already-resolved head-to-head decision.
    const projection = calculatePromotionProjection(standings, leagues);
    expect(projection.ambiguities).toEqual([]);
    expect(projection.movements).toContainEqual({
      userId: 'a',
      fromLeagueId: 'div1',
      toLeagueId: 'prem',
      fromPosition: 1,
      kind: 'PROMOTED',
    });
  });

  it('blocks a movement boundary whenever a shared authoritative rank crosses it', () => {
    const standings = new Map<string, StandingPosition[]>([
      ['prem', [row('p1', 1)]],
      ['div1', [
        row('a', 1, { legDifference: 7, average: 71, username: 'Zulu' }),
        row('b', 1, { legDifference: -4, average: 39, username: 'Alpha' }),
        row('c', 3, { points: 8, legsFor: 18 }),
      ]],
    ]);

    // Leg difference, average and username are presentation statistics only.
    // Because A and B share rank 1, a one-place promotion boundary is unresolved.
    const projection = calculatePromotionProjection(standings, leagues);
    expect(projection.ambiguities).toEqual([
      {
        leagueId: 'div1',
        boundary: 'PROMOTION',
        position: 1,
        tiedUserIds: ['a', 'b'],
      },
    ]);
  });

  it('collects every competitor sharing the boundary rank even when legacy metrics differ', () => {
    const standings = new Map<string, StandingPosition[]>([
      ['prem', [row('p1', 1)]],
      ['div1', [
        row('a', 1, { legDifference: 5, average: 65 }),
        row('b', 1, { legDifference: 0, average: 50 }),
        row('c', 1, { legDifference: -5, average: 35 }),
        row('d', 4, { points: 8, legsFor: 18 }),
      ]],
    ]);

    const projection = calculatePromotionProjection(standings, leagues);
    expect(projection.ambiguities[0]?.tiedUserIds).toEqual(['a', 'b', 'c']);
  });
});
