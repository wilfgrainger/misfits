export type MatchValidationResult =
  | { ok: true }
  | { ok: false; reason: 'INTEGER' | 'NEGATIVE' | 'DRAW' | 'TARGET' };

export function validatePlayerScore(
  playerALegs: number,
  playerBLegs: number,
  targetLegs: number,
): MatchValidationResult {
  if (![playerALegs, playerBLegs, targetLegs].every(Number.isInteger)) {
    return { ok: false, reason: 'INTEGER' };
  }
  if (playerALegs < 0 || playerBLegs < 0 || targetLegs <= 0) {
    return { ok: false, reason: 'NEGATIVE' };
  }
  if (playerALegs === playerBLegs) return { ok: false, reason: 'DRAW' };
  const winner = Math.max(playerALegs, playerBLegs);
  const loser = Math.min(playerALegs, playerBLegs);
  if (winner !== targetLegs || loser >= targetLegs) {
    return { ok: false, reason: 'TARGET' };
  }
  return { ok: true };
}
