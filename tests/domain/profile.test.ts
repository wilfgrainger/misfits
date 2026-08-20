import { describe, expect, it } from 'vitest';
import { validateProfileInput } from '../../src/server/domain/profile';

describe('profile rules', () => {
  it('normalizes a nickname and optional HTTPS profile link', () => {
    expect(validateProfileInput({ username: '  Wilf   501  ', dartsCounterUrl: 'https://darts.example/player/wilf' })).toEqual({
      ok: true,
      value: { username: 'Wilf 501', dartsCounterUrl: 'https://darts.example/player/wilf' },
    });
  });

  it('allows a missing profile link', () => {
    expect(validateProfileInput({ username: 'Wilf 501', dartsCounterUrl: '' })).toEqual({
      ok: true,
      value: { username: 'Wilf 501', dartsCounterUrl: null },
    });
  });

  it.each(['http://darts.example/player/wilf', 'javascript:alert(1)', 'not a url'])('rejects unsafe profile links: %s', (dartsCounterUrl) => {
    expect(validateProfileInput({ username: 'Wilf 501', dartsCounterUrl })).toEqual({ ok: false, reason: 'DARTS_COUNTER_URL' });
  });
});
