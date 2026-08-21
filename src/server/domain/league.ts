export type LeagueStatus = 'OPEN' | 'CLOSED';
export type LeagueVisibility = 'PUBLIC' | 'PRIVATE';

export interface LeagueInput {
  name: string;
  slug: string;
  seasonName: string;
  maxPlayers: number;
  matchesPerPair: number;
  pointsPerWin: number;
  targetLegs: number;
  status: LeagueStatus;
  visibility: LeagueVisibility;
}

export type LeagueValidation =
  | { ok: true; value: LeagueInput }
  | { ok: false; reason: 'NAME' | 'SEASON' | 'SLUG' | 'MAX_PLAYERS' | 'MATCHES_PER_PAIR' | 'POINTS_PER_WIN' | 'TARGET_LEGS' | 'STATUS' | 'VISIBILITY' | 'INPUT' };

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
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
  if (!integerInRange(value.pointsPerWin ?? 2, 1, 100)) return { ok: false, reason: 'POINTS_PER_WIN' };
  if (!integerInRange(value.targetLegs ?? 3, 1, 20)) return { ok: false, reason: 'TARGET_LEGS' };
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
      pointsPerWin: Number(value.pointsPerWin ?? 2),
      targetLegs: Number(value.targetLegs ?? 3),
      status,
      visibility,
    },
  };
}
