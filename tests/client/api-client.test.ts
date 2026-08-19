import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiClientError } from '../../src/client/api/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser API client', () => {
  it('rejects a failed result submission with the server validation error', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      error: { code: 'INVALID_RESULT', message: 'That score is not valid.' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const submission = api.submitResult({
      opponentId: 'bob',
      myLegs: 2,
      opponentLegs: 1,
    });

    await expect(submission).rejects.toEqual(expect.objectContaining({
      name: 'ApiClientError',
      status: 400,
      code: 'INVALID_RESULT',
      message: 'That score is not valid.',
    } satisfies Partial<ApiClientError>));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/results');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });
});
