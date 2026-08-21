import { normalizeSlug } from './league';

export type SeasonStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type FixtureStatus = 'OUTSTANDING' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED' | 'VOID';
export type CompetitionVisibility = 'PUBLIC' | 'PRIVATE';

export interface SeasonInput {
  name: string;
  status: SeasonStatus;
  isCurrent: boolean;
}

export type SeasonValidation =
  | { ok: true; value: SeasonInput }
  | { ok: false; reason: 'INPUT' | 'NAME' | 'STATUS' | 'CURRENT' };

export interface CompetitionLeagueInput {
  name: string;
  slug: string;
  maxPlayers: number;
  matchesPerPair: number;
  pointsPerWin: number;
  targetLegs: number;
  visibility: CompetitionVisibility;
  hierarchyPosition: number;
  promotionPlaces: number;
  relegationPlaces: number;
}

export type CompetitionLeagueValidation =
  | { ok: true; value: CompetitionLeagueInput }
  | { ok: false; reason: 'INPUT' | 'NAME' | 'SLUG' | 'MAX_PLAYERS' | 'MATCHES_PER_PAIR' | 'POINTS_PER_WIN' | 'TARGET_LEGS' | 'VISIBILITY' | 'HIERARCHY' | 'PROMOTION' | 'RELEGATION' | 'MOVEMENT_OVERLAP' };

export interface GeneratedFixture {
  playerAId: string;
  playerBId: string;
  round: number;
  meetingNumber: number;
}

export interface StandingPosition {
  userId: string;
  position: number;
  points: number;
  legDifference: number;
  legsFor: number;
  average: number;
  username: string;
}

export interface MovementZones {
  promotion: number[];
  relegation: number[];
}

export interface LeagueMovementConfig {
  leagueId: string;
  hierarchyPosition: number;
  promotionPlaces: number;
  relegationPlaces: number;
}

export interface PromotionMovement {
  userId: string;
  fromLeagueId: string;
  toLeagueId: string;
  fromPosition: number;
  kind: 'PROMOTED' | 'RELEGATED';
}

export interface PromotionAmbiguity {
  leagueId: string;
  boundary: 'PROMOTION' | 'RELEGATION';
  position: number;
  tiedUserIds: string[];
}

export interface PromotionProjection {
  movements: PromotionMovement[];
  ambiguities: PromotionAmbiguity[];
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function validateSeasonInput(input: unknown): SeasonValidation {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'INPUT' };
  const value = input as Record<string, unknown>;
  if (typeof value.name !== 'string' || value.name.trim().length < 1 || value.name.trim().length > 80) {
    return { ok: false, reason: 'NAME' };
  }
  if (value.status !== 'DRAFT' && value.status !== 'OPEN' && value.status !== 'CLOSED') {
    return { ok: false, reason: 'STATUS' };
  }
  if (value.isCurrent !== undefined && typeof value.isCurrent !== 'boolean') {
    return { ok: false, reason: 'CURRENT' };
  }
  return {
    ok: true,
    value: {
      name: value.name.trim(),
      status: value.status,
      isCurrent: value.isCurrent ?? false,
    },
  };
}

export function validateCompetitionLeagueInput(input: unknown): CompetitionLeagueValidation {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'INPUT' };
  const value = input as Record<string, unknown>;
  if (typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.trim().length > 80) return { ok: false, reason: 'NAME' };
  const slug = normalizeSlug(typeof value.slug === 'string' && value.slug.trim() ? value.slug : value.name);
  if (!slug) return { ok: false, reason: 'SLUG' };
  if (!integerInRange(value.maxPlayers ?? 32, 2, 1000)) return { ok: false, reason: 'MAX_PLAYERS' };
  if (!integerInRange(value.matchesPerPair ?? 1, 1, 20)) return { ok: false, reason: 'MATCHES_PER_PAIR' };
  if (!integerInRange(value.pointsPerWin ?? 2, 1, 100)) return { ok: false, reason: 'POINTS_PER_WIN' };
  if (!integerInRange(value.targetLegs ?? 3, 1, 20)) return { ok: false, reason: 'TARGET_LEGS' };
  const visibility = value.visibility ?? 'PRIVATE';
  if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') return { ok: false, reason: 'VISIBILITY' };
  if (!integerInRange(value.hierarchyPosition ?? 1, 1, 100)) return { ok: false, reason: 'HIERARCHY' };
  if (!integerInRange(value.promotionPlaces ?? 0, 0, 1000)) return { ok: false, reason: 'PROMOTION' };
  if (!integerInRange(value.relegationPlaces ?? 0, 0, 1000)) return { ok: false, reason: 'RELEGATION' };
  const maxPlayers = Number(value.maxPlayers ?? 32);
  const promotionPlaces = Number(value.promotionPlaces ?? 0);
  const relegationPlaces = Number(value.relegationPlaces ?? 0);
  if (promotionPlaces + relegationPlaces > maxPlayers) return { ok: false, reason: 'MOVEMENT_OVERLAP' };
  return {
    ok: true,
    value: {
      name: value.name.trim(),
      slug,
      maxPlayers,
      matchesPerPair: Number(value.matchesPerPair ?? 1),
      pointsPerWin: Number(value.pointsPerWin ?? 2),
      targetLegs: Number(value.targetLegs ?? 3),
      visibility,
      hierarchyPosition: Number(value.hierarchyPosition ?? 1),
      promotionPlaces,
      relegationPlaces,
    },
  };
}

function rotate<T>(values: Array<T | null>): Array<T | null> {
  if (values.length <= 2) return values;
  const fixed = values[0];
  const rest = values.slice(1);
  rest.unshift(rest.pop() ?? null);
  return [fixed, ...rest];
}

/**
 * Deterministic circle-method round robin. A null sentinel is introduced for
 * odd-sized leagues and discarded as a bye. Repeat meetings are assigned to
 * later rounds and alternate the player ordering for a balanced presentation.
 */
export function generateRoundRobinFixtures(playerIds: string[], repeats = 1): GeneratedFixture[] {
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('Repeat count must be between 1 and 20');
  const distinct = [...new Set(playerIds)];
  if (distinct.length !== playerIds.length) throw new Error('Player ids must be unique');
  if (distinct.length < 2) return [];

  let ring: Array<string | null> = [...distinct];
  if (ring.length % 2 === 1) ring.push(null);
  const roundsPerMeeting = ring.length - 1;
  const fixtures: GeneratedFixture[] = [];

  for (let meeting = 1; meeting <= repeats; meeting += 1) {
    let meetingRing = [...ring];
    for (let roundIndex = 0; roundIndex < roundsPerMeeting; roundIndex += 1) {
      for (let index = 0; index < meetingRing.length / 2; index += 1) {
        const left = meetingRing[index];
        const right = meetingRing[meetingRing.length - 1 - index];
        if (!left || !right) continue;
        const swap = meeting % 2 === 0;
        fixtures.push({
          playerAId: swap ? right : left,
          playerBId: swap ? left : right,
          round: (meeting - 1) * roundsPerMeeting + roundIndex + 1,
          meetingNumber: meeting,
        });
      }
      meetingRing = rotate(meetingRing);
    }
  }
  return fixtures;
}

export function movementZones(playerCount: number, promotionPlaces: number, relegationPlaces: number): MovementZones {
  for (const [name, value] of [['player count', playerCount], ['promotion places', promotionPlaces], ['relegation places', relegationPlaces]] as const) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  }
  if (promotionPlaces + relegationPlaces > playerCount) throw new Error('Promotion and relegation zones overlap');
  const promotion = Array.from({ length: promotionPlaces }, (_, index) => index + 1);
  const relegation = Array.from({ length: relegationPlaces }, (_, index) => playerCount - relegationPlaces + index + 1);
  return { promotion, relegation };
}

export function pairKey(playerAId: string, playerBId: string): string {
  if (!playerAId || !playerBId || playerAId === playerBId) throw new Error('Fixture players must be distinct');
  return [playerAId, playerBId].sort().join(':');
}

export function calculatePromotionMovements(
  standingsByLeague: Map<string, StandingPosition[]>,
  orderedLeagues: LeagueMovementConfig[],
): PromotionMovement[] {
  const leagues = [...orderedLeagues].sort((a, b) => a.hierarchyPosition - b.hierarchyPosition);
  const movements: PromotionMovement[] = [];
  leagues.forEach((league, index) => {
    const standings = standingsByLeague.get(league.leagueId) ?? [];
    const zones = movementZones(standings.length, index === 0 ? 0 : league.promotionPlaces, index === leagues.length - 1 ? 0 : league.relegationPlaces);
    for (const position of zones.promotion) {
      const row = standings[position - 1];
      const target = leagues[index - 1];
      if (row && target) movements.push({ userId: row.userId, fromLeagueId: league.leagueId, toLeagueId: target.leagueId, fromPosition: position, kind: 'PROMOTED' });
    }
    for (const position of zones.relegation) {
      const row = standings[position - 1];
      const target = leagues[index + 1];
      if (row && target) movements.push({ userId: row.userId, fromLeagueId: league.leagueId, toLeagueId: target.leagueId, fromPosition: position, kind: 'RELEGATED' });
    }
  });
  return movements;
}

function sameCompetitiveRank(left: StandingPosition, right: StandingPosition): boolean {
  return left.points === right.points
    && left.legDifference === right.legDifference
    && left.legsFor === right.legsFor
    && left.average === right.average;
}

function tiedUserIds(standings: StandingPosition[], boundaryIndex: number): string[] {
  const boundary = standings[boundaryIndex];
  if (!boundary) return [];
  return standings.filter((row) => sameCompetitiveRank(row, boundary)).map((row) => row.userId).sort();
}

/**
 * Projection deliberately ignores the username fallback used for display
 * ordering. If two players are equal on every approved competitive metric at
 * a movement boundary, an administrator must resolve the tie before a final
 * proposal can be written.
 */
export function calculatePromotionProjection(
  standingsByLeague: Map<string, StandingPosition[]>,
  orderedLeagues: LeagueMovementConfig[],
): PromotionProjection {
  const leagues = [...orderedLeagues].sort((a, b) => a.hierarchyPosition - b.hierarchyPosition);
  const ambiguities: PromotionAmbiguity[] = [];

  leagues.forEach((league, index) => {
    const standings = standingsByLeague.get(league.leagueId) ?? [];
    const promotionPlaces = index === 0 ? 0 : league.promotionPlaces;
    const relegationPlaces = index === leagues.length - 1 ? 0 : league.relegationPlaces;

    if (promotionPlaces > 0 && promotionPlaces < standings.length) {
      const lastPromoted = standings[promotionPlaces - 1];
      const firstSafe = standings[promotionPlaces];
      if (lastPromoted && firstSafe && sameCompetitiveRank(lastPromoted, firstSafe)) {
        ambiguities.push({
          leagueId: league.leagueId,
          boundary: 'PROMOTION',
          position: promotionPlaces,
          tiedUserIds: tiedUserIds(standings, promotionPlaces - 1),
        });
      }
    }

    const firstRelegatedIndex = standings.length - relegationPlaces;
    if (relegationPlaces > 0 && firstRelegatedIndex > 0 && firstRelegatedIndex < standings.length) {
      const lastSafe = standings[firstRelegatedIndex - 1];
      const firstRelegated = standings[firstRelegatedIndex];
      if (lastSafe && firstRelegated && sameCompetitiveRank(lastSafe, firstRelegated)) {
        ambiguities.push({
          leagueId: league.leagueId,
          boundary: 'RELEGATION',
          position: firstRelegatedIndex + 1,
          tiedUserIds: tiedUserIds(standings, firstRelegatedIndex),
        });
      }
    }
  });

  return {
    movements: calculatePromotionMovements(standingsByLeague, leagues),
    ambiguities,
  };
}
