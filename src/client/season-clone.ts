import type { LeagueSummary, SeasonSummary } from './api';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function text(row: Record<string, unknown>, camel: string, snake = camel): string {
  const value = row[camel] ?? row[snake];
  return typeof value === 'string' ? value : '';
}

function number(row: Record<string, unknown>, camel: string, snake = camel): number {
  const value = row[camel] ?? row[snake];
  return typeof value === 'number' ? value : 0;
}

function optionalNumber(row: Record<string, unknown>, camel: string, snake = camel): number | undefined {
  const value = row[camel] ?? row[snake];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeSeason(value: unknown): SeasonSummary {
  const row = record(value);
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    status: text(row, 'status') as SeasonSummary['status'],
    isCurrent: (row.isCurrent ?? row.is_current) === true || (row.isCurrent ?? row.is_current) === 1,
    createdAt: text(row, 'createdAt', 'created_at'),
    updatedAt: text(row, 'updatedAt', 'updated_at'),
    closedAt: typeof (row.closedAt ?? row.closed_at) === 'string' ? String(row.closedAt ?? row.closed_at) : null,
  };
}

function normalizeLeague(value: unknown): LeagueSummary {
  const row = record(value);
  const legacyTargetLegs = optionalNumber(row, 'targetLegs', 'target_legs');
  const maxLegs = optionalNumber(row, 'maxLegs', 'max_legs') ?? ((legacyTargetLegs ?? 3) * 2) - 1;
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    slug: text(row, 'slug'),
    seasonName: text(row, 'seasonName', 'season_name'),
    status: text(row, 'status') as LeagueSummary['status'],
    maxLegs,
    pointsPerWin: optionalNumber(row, 'pointsPerWin', 'points_per_win') ?? 2,
    pointsPerDraw: optionalNumber(row, 'pointsPerDraw', 'points_per_draw') ?? 0,
    pointsPerLoss: optionalNumber(row, 'pointsPerLoss', 'points_per_loss') ?? 0,
    targetLegs: legacyTargetLegs ?? Math.floor(maxLegs / 2) + 1,
    maxPlayers: number(row, 'maxPlayers', 'max_players'),
    matchesPerPair: number(row, 'matchesPerPair', 'matches_per_pair'),
    visibility: text(row, 'visibility') as LeagueSummary['visibility'],
    seasonId: text(row, 'seasonId', 'season_id') || null,
    hierarchyPosition: number(row, 'hierarchyPosition', 'hierarchy_position'),
    promotionPlaces: number(row, 'promotionPlaces', 'promotion_places'),
    relegationPlaces: number(row, 'relegationPlaces', 'relegation_places'),
    createdAt: text(row, 'createdAt', 'created_at'),
    updatedAt: text(row, 'updatedAt', 'updated_at'),
  };
}

export async function cloneSeasonStructure(seasonId: string, name: string): Promise<{ season: SeasonSummary; leagues: LeagueSummary[] }> {
  const response = await fetch(`/api/admin/seasons/${encodeURIComponent(seasonId)}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  const payload = await response.json().catch(() => null) as { season?: unknown; leagues?: unknown[]; error?: { message?: string } } | null;
  if (!response.ok || !payload?.season) throw new Error(payload?.error?.message ?? 'Season structure could not be copied');
  return {
    season: normalizeSeason(payload.season),
    leagues: Array.isArray(payload.leagues) ? payload.leagues.map(normalizeLeague) : [],
  };
}
