import { legsToWin, maxLegsFromLegacyTarget, type LeagueScoringRules } from './scoring';

export interface ResultInput {
  playerAId: string;
  playerBId: string;
  playerALegs: number;
  playerBLegs: number;
  playerAAverage: number;
  playerBAverage: number;
}

export type ResultValidation =
  | { ok: true; value: ResultInput }
  | { ok: false; reason: 'INPUT' | 'PLAYERS' | 'SCORE' | 'AVERAGE' };

export function canonicalPair(playerAId: string, playerBId: string): readonly [string, string] {
  return playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
}

function validAverage(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 200;
}

function compatibleRules(rulesOrTargetLegs: LeagueScoringRules | number): LeagueScoringRules {
  if (typeof rulesOrTargetLegs !== 'number') return rulesOrTargetLegs;
  return {
    maxLegs: maxLegsFromLegacyTarget(rulesOrTargetLegs),
    pointsPerWin: 2,
    pointsPerDraw: 0,
    pointsPerLoss: 0,
  };
}

export function validatePlayerResult(input: unknown, rulesOrTargetLegs: LeagueScoringRules | number): ResultValidation {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'INPUT' };
  const value = input as Record<string, unknown>;
  if (typeof value.playerAId !== 'string' || typeof value.playerBId !== 'string' || value.playerAId === value.playerBId) return { ok: false, reason: 'PLAYERS' };

  const rules = compatibleRules(rulesOrTargetLegs);
  if (!Number.isInteger(rules.maxLegs) || rules.maxLegs < 1) return { ok: false, reason: 'SCORE' };

  const playerALegs = Number(value.playerALegs);
  const playerBLegs = Number(value.playerBLegs);
  if (!Number.isInteger(value.playerALegs) || !Number.isInteger(value.playerBLegs) || playerALegs < 0 || playerBLegs < 0) return { ok: false, reason: 'SCORE' };

  const target = legsToWin(rules.maxLegs);
  const totalLegs = playerALegs + playerBLegs;
  const draw = rules.maxLegs % 2 === 0
    && playerALegs === rules.maxLegs / 2
    && playerBLegs === rules.maxLegs / 2;
  const decisive = totalLegs <= rules.maxLegs && (
    (playerALegs === target && playerBLegs < target)
    || (playerBLegs === target && playerALegs < target)
  );

  if (!draw && !decisive) return { ok: false, reason: 'SCORE' };
  if (!validAverage(value.playerAAverage) || !validAverage(value.playerBAverage)) return { ok: false, reason: 'AVERAGE' };
  return {
    ok: true,
    value: {
      playerAId: value.playerAId,
      playerBId: value.playerBId,
      playerALegs,
      playerBLegs,
      playerAAverage: Math.round(Number(value.playerAAverage) * 100) / 100,
      playerBAverage: Math.round(Number(value.playerBAverage) * 100) / 100,
    },
  };
}
