import { maxLegsFromLegacyTarget, type LeagueScoringRules } from '../domain/scoring';

export interface PersistedLeagueScoring {
  target_legs: number;
  max_legs?: number | null;
  points_per_win: number;
  points_per_draw?: number | null;
  points_per_loss?: number | null;
}

export function scoringRulesForLeague(league: PersistedLeagueScoring): LeagueScoringRules {
  return {
    maxLegs: Number.isInteger(league.max_legs) ? Number(league.max_legs) : maxLegsFromLegacyTarget(league.target_legs),
    pointsPerWin: Number(league.points_per_win),
    pointsPerDraw: Number(league.points_per_draw ?? 0),
    pointsPerLoss: Number(league.points_per_loss ?? 0),
  };
}
