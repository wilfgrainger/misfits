import { validateUsername } from './username';

const DARTS_COUNTER_HOSTS = new Set(['dartcounter.net', 'www.dartcounter.net']);

export interface ProfileUpdate {
  username?: string;
  dartsCounterUrl?: string | null;
}

export type ProfileValidation =
  | { ok: true; value: ProfileUpdate }
  | { ok: false; reason: 'USERNAME' | 'DARTS_COUNTER_URL' | 'INPUT' };

export function validateProfileInput(input: unknown): ProfileValidation {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'INPUT' };
  const value = input as Record<string, unknown>;
  const result: ProfileUpdate = {};

  if ('username' in value) {
    if (typeof value.username !== 'string') return { ok: false, reason: 'USERNAME' };
    const username = validateUsername(value.username);
    if (!username.ok) return { ok: false, reason: 'USERNAME' };
    result.username = username.value;
  }

  if ('dartsCounterUrl' in value) {
    if (value.dartsCounterUrl === null || value.dartsCounterUrl === '') {
      result.dartsCounterUrl = null;
    } else if (typeof value.dartsCounterUrl !== 'string') {
      return { ok: false, reason: 'DARTS_COUNTER_URL' };
    } else {
      try {
        const url = new URL(value.dartsCounterUrl.trim());
        if (url.protocol !== 'https:' || !DARTS_COUNTER_HOSTS.has(url.hostname.toLowerCase()) || url.port || url.username || url.password) {
          return { ok: false, reason: 'DARTS_COUNTER_URL' };
        }
        result.dartsCounterUrl = url.toString();
      } catch {
        return { ok: false, reason: 'DARTS_COUNTER_URL' };
      }
    }
  }

  return { ok: true, value: result };
}
