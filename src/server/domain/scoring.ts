export interface LeagueScoringRules {
  maxLegs: number;
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
}

export function legsToWin(maxLegs: number): number {
  return Math.floor(maxLegs / 2) + 1;
}

export function maxLegsFromLegacyTarget(targetLegs: number): number {
  return (targetLegs * 2) - 1;
}
