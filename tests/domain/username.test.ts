import { describe, expect, it } from 'vitest';
import { normalizeUsername, validateUsername } from '../../src/server/domain/username';

describe('username rules', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeUsername('  Wilf   The Dart  ')).toBe('Wilf The Dart');
  });

  it.each(['ab', 'x'.repeat(25)])('rejects invalid length: %s', (input) => {
    expect(validateUsername(input)).toEqual({ ok: false, reason: 'LENGTH' });
  });

  it('rejects unsupported punctuation', () => {
    expect(validateUsername('Wilf!')).toEqual({ ok: false, reason: 'CHARACTERS' });
  });

  it.each(['admin', 'Administrator'])('rejects reserved names: %s', (input) => {
    expect(validateUsername(input)).toEqual({ ok: false, reason: 'RESERVED' });
  });

  it('accepts the permitted character set', () => {
    expect(validateUsername('Wilf_501-Club')).toEqual({ ok: true, value: 'Wilf_501-Club' });
  });
});
