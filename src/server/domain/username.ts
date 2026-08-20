const RESERVED_NAMES = new Set([
  'admin',
  'administrator',
  'misfits',
  'misfits admin',
  'misfits501',
  'misfits 501',
]);

export function normalizeUsername(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export type UsernameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: 'LENGTH' | 'CHARACTERS' | 'RESERVED' };

export function validateUsername(input: string): UsernameValidation {
  const value = normalizeUsername(input);
  if (value.length < 3 || value.length > 24) return { ok: false, reason: 'LENGTH' };
  if (!/^[A-Za-z0-9 _-]+$/.test(value)) return { ok: false, reason: 'CHARACTERS' };
  if (RESERVED_NAMES.has(value.toLowerCase())) return { ok: false, reason: 'RESERVED' };
  return { ok: true, value };
}
