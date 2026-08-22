import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateCompetitionLeagueInput } from '../../src/server/domain/competition';
import { validateLeagueInput } from '../../src/server/domain/league';

describe('configurable league scoring contract', () => {
  it('accepts an even Best-of format with configurable win draw and loss points', () => {
    const legacy = validateLeagueInput({
      name: 'Premier',
      slug: 'premier',
      seasonName: '2026/27',
      maxPlayers: 12,
      matchesPerPair: 2,
      maxLegs: 6,
      pointsPerWin: 3,
      pointsPerDraw: 1,
      pointsPerLoss: 0,
      status: 'OPEN',
      visibility: 'PUBLIC',
    }, 'create');

    expect(legacy).toEqual({
      ok: true,
      value: {
        name: 'Premier',
        slug: 'premier',
        seasonName: '2026/27',
        maxPlayers: 12,
        matchesPerPair: 2,
        maxLegs: 6,
        pointsPerWin: 3,
        pointsPerDraw: 1,
        pointsPerLoss: 0,
        targetLegs: 4,
        status: 'OPEN',
        visibility: 'PUBLIC',
      },
    });

    const competition = validateCompetitionLeagueInput({
      name: 'Premier',
      slug: 'premier',
      maxPlayers: 12,
      matchesPerPair: 2,
      maxLegs: 6,
      pointsPerWin: 3,
      pointsPerDraw: 1,
      pointsPerLoss: 0,
      visibility: 'PUBLIC',
      hierarchyPosition: 1,
      promotionPlaces: 0,
      relegationPlaces: 2,
    });

    expect(competition.ok).toBe(true);
    if (!competition.ok) return;
    expect(competition.value.maxLegs).toBe(6);
    expect(competition.value.targetLegs).toBe(4);
    expect(competition.value.pointsPerWin).toBe(3);
    expect(competition.value.pointsPerDraw).toBe(1);
    expect(competition.value.pointsPerLoss).toBe(0);
  });

  it('accepts zero-point outcomes but rejects negative scoring values', () => {
    const zeroLoss = validateLeagueInput({
      name: 'Premier',
      seasonName: '2026/27',
      maxLegs: 6,
      pointsPerWin: 3,
      pointsPerDraw: 1,
      pointsPerLoss: 0,
    }, 'create');
    expect(zeroLoss.ok).toBe(true);

    const negativeDraw = validateLeagueInput({
      name: 'Premier',
      seasonName: '2026/27',
      maxLegs: 6,
      pointsPerWin: 3,
      pointsPerDraw: -1,
      pointsPerLoss: 0,
    }, 'create');
    expect(negativeDraw).toEqual({ ok: false, reason: 'POINTS_PER_DRAW' });
  });

  it('ships an additive migration that preserves legacy first-to formats', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'migrations/0005_configurable_match_scoring.sql'),
      'utf8',
    );

    expect(migration).toContain('ADD COLUMN max_legs');
    expect(migration).toContain('ADD COLUMN points_per_draw');
    expect(migration).toContain('ADD COLUMN points_per_loss');
    expect(migration).toMatch(/max_legs\s*=\s*\(target_legs\s*\*\s*2\)\s*-\s*1/i);
  });
});
