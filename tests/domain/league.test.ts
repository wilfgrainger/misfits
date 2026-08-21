import { describe, expect, it } from 'vitest';
import { normalizeSlug, validateLeagueInput } from '../../src/server/domain/league';

describe('league rules', () => {
  it('normalizes a display name into a URL-safe slug', () => {
    expect(normalizeSlug('  Friday Night 501! ')).toBe('friday-night-501');
  });

  it('defaults an omitted create visibility to private without changing an explicit public choice', () => {
    const base = { name: 'Friday Club', seasonName: '2027', maxPlayers: 8, matchesPerPair: 1, targetLegs: 3, pointsPerWin: 2 };

    expect(validateLeagueInput(base, 'create')).toMatchObject({ ok: true, value: { visibility: 'PRIVATE' } });
    expect(validateLeagueInput({ ...base, visibility: 'PUBLIC' }, 'create')).toMatchObject({ ok: true, value: { visibility: 'PUBLIC' } });
  });

  it('accepts default league settings', () => {
    expect(validateLeagueInput({ name: 'Friday Night 501', seasonName: '2026', maxPlayers: 16 }, 'create')).toEqual({
      ok: true,
      value: {
        name: 'Friday Night 501',
        slug: 'friday-night-501',
        seasonName: '2026',
        maxPlayers: 16,
        matchesPerPair: 1,
      pointsPerWin: 2,
      targetLegs: 3,
      status: 'OPEN',
      visibility: 'PRIVATE',
      },
    });
  });

  it('rejects a capacity smaller than two or a repeat count below one', () => {
    expect(validateLeagueInput({ name: 'Tiny', seasonName: '2026', maxPlayers: 1 }, 'create')).toEqual({ ok: false, reason: 'MAX_PLAYERS' });
    expect(validateLeagueInput({ name: 'Tiny', seasonName: '2026', maxPlayers: 2, matchesPerPair: 0 }, 'create')).toEqual({ ok: false, reason: 'MATCHES_PER_PAIR' });
  });
});
