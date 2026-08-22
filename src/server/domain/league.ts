import { legsToWin, maxLegsFromLegacyTarget } from './scoring';

export type LeagueStatus = 'OPEN' | 'CLOSED';
export type LeagueVisibility = 'PUBLIC' | 'PRIVATE';

export interface LeagueInput {
  name: string;
  slug: string;
  seasonName: string;
  maxPlayers: number;
  matchesPerPair: number;
  maxLegs: number;
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
  /** Compatibility mirror only. New writes are authoritative through maxLegs. */
  targetLegs: number;
  status: LeagueStatus;
  visibility: LeagueVisibility;
}

export type LeagueValidation =
  | { ok: true; value: LeagueInput }
  | { ok: false; reason: 'NAME' | 'SEASON' | 'SLUG' | 'MAX_PLAYERS' | 'MATCHES_PER_PAIR' | 'MAX_LEGS' | 'POINTS_PER_WIN' | 'POINTS_PER_DRAW' | 'POINTS_PER_LOSS' | 'TARGET_LEGS' | 'STATUS' | 'VISIBILITY' | 'INPUT' };

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function scoringLegs(value: Record<string, unknown>): { maxLegs: number; targetLegs: number } | { reason: 'MAX_LEGS' | 'TARGET_LEGS' } {
  if (value.maxLegs !== undefined) {
    if (!integerInRange(value.maxLegs, 1, 40)) return { reason: 'MAX_LEGS' };
    const maxLegs = Number(value.maxLegs);
    return { maxLegs, targetLegs: legsToWin(maxLegs) };
  }

  if (!integerInRange(value.targetLegs ?? 3, 1, 20)) return { reason: 'TARGET_LEGS' };
  const targetLegs = Number(value.targetLegs ?? 3);
  return { maxLegs: maxLegsFromLegacyTarget(targetLegs), targetLegs };
}

export function validateLeagueInput(input: unknown, mode: 'create' | 'edit'): LeagueValidation {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'INPUT' };
  const value = input as Record<string, unknown>;
  if (typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.trim().length > 80) return { ok: false, reason: 'NAME' };
  if (typeof value.seasonName !== 'string' || value.seasonName.trim().length < 1 || value.seasonName.trim().length > 40) return { ok: false, reason: 'SEASON' };
  const slug = normalizeSlug(typeof value.slug === 'string' && value.slug.trim() ? value.slug : value.name);
  if (!slug) return { ok: false, reason: 'SLUG' };
  if (!integerInRange(value.maxPlayers ?? 32, 2, 1000)) return { ok: false, reason: 'MAX_PLAYERS' };
  if (!integerInRange(value.matchesPerPair ?? 1, 1, 20)) return { ok: false, reason: 'MATCHES_PER_PAIR' };
  if (!integerInRange(value.pointsPerWin ?? 2, 0, 100)) return { ok: false, reason: 'POINTS_PER_WIN' };
  if (!integerInRange(value.pointsPerDraw ?? 0, 0, 100)) return { ok: false, reason: 'POINTS_PER_DRAW' };
  if (!integerInRange(value.pointsPerLoss ?? 0, 0, 100)) return { ok: false, reason: 'POINTS_PER_LOSS' };
  const legs = scoringLegs(value);
  if ('reason' in legs) return { ok: false, reason: legs.reason };
  const status = value.status ?? 'OPEN';
  if (status !== 'OPEN' && status !== 'CLOSED') return { ok: false, reason: 'STATUS' };
  const visibility = value.visibility ?? (mode === 'create' ? 'PRIVATE' : 'PUBLIC');
  if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') return { ok: false, reason: 'VISIBILITY' };
  return {
    ok: true,
    value: {
      name: value.name.trim(),
      slug,
      seasonName: value.seasonName.trim(),
      maxPlayers: Number(value.maxPlayers ?? 32),
      matchesPerPair: Number(value.matchesPerPair ?? 1),
      maxLegs: legs.maxLegs,
      pointsPerWin: Number(value.pointsPerWin ?? 2),
      pointsPerDraw: Number(value.pointsPerDraw ?? 0),
      pointsPerLoss: Number(value.pointsPerLoss ?? 0),
      targetLegs: legs.targetLegs,
      status,
      visibility,
    },
  };
}
