import type { LeagueSummary } from './api';

export const TABLE_TIE_BREAK_DESCRIPTION = 'Table: Points → Legs won → Head-to-head';

export function effectiveMaxLegs(league: Pick<LeagueSummary, 'maxLegs' | 'targetLegs'>): number {
  if (Number.isFinite(league.maxLegs) && league.maxLegs > 0) return league.maxLegs;
  if (Number.isFinite(league.targetLegs) && league.targetLegs > 0) return (league.targetLegs * 2) - 1;
  return 5;
}

export function legsToWin(maxLegs: number): number {
  return Math.floor(maxLegs / 2) + 1;
}

export function matchFormatDescription(maxLegs: number): string {
  const target = legsToWin(maxLegs);
  if (maxLegs % 2 === 0) {
    const drawLegs = maxLegs / 2;
    return `Best of ${maxLegs}: first to ${target} wins; ${drawLegs}-${drawLegs} is a draw.`;
  }
  return `Best of ${maxLegs}: first to ${target} wins; no draw.`;
}

export function leagueScoringSummary(league: Pick<LeagueSummary, 'maxLegs' | 'targetLegs' | 'pointsPerWin' | 'pointsPerDraw' | 'pointsPerLoss' | 'matchesPerPair'>): string {
  const maxLegs = effectiveMaxLegs(league);
  const target = legsToWin(maxLegs);
  const win = Number.isFinite(league.pointsPerWin) ? league.pointsPerWin : 2;
  const draw = Number.isFinite(league.pointsPerDraw) ? league.pointsPerDraw : 0;
  const loss = Number.isFinite(league.pointsPerLoss) ? league.pointsPerLoss : 0;
  const meetings = Number.isFinite(league.matchesPerPair) && league.matchesPerPair > 0 ? league.matchesPerPair : 1;
  return `Best of ${maxLegs} · First to ${target} · Win ${win} · Draw ${draw} · Loss ${loss} · ${meetings} meeting${meetings === 1 ? '' : 's'} per pair`;
}

export function resultOutcomeLabel(
  playerALegs: number,
  playerBLegs: number,
  playerAUsername?: string | null,
  playerBUsername?: string | null,
): string {
  if (playerALegs === playerBLegs) return 'Draw';
  const winner = playerALegs > playerBLegs ? playerAUsername : playerBUsername;
  return `Winner: ${winner ?? 'Player'}`;
}
