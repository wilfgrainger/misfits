import { describe, expect, it } from 'vitest';
import worker from '../../src/server/index';

function env(databaseHealthy = true) {
  return {
    DB: {
      prepare: () => ({
        first: async () => {
          if (!databaseHealthy) throw new Error('D1 unavailable');
          return { ok: 1 };
        },
      }),
    },
  } as never;
}

describe('GET /api/health', () => {
  it('proves the Worker can reach D1', async () => {
    const response = await worker.fetch(
      new Request('https://misfits.test/api/health'),
      env(),
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns unhealthy when D1 cannot be reached', async () => {
    const response = await worker.fetch(
      new Request('https://misfits.test/api/health'),
      env(false),
      {} as never,
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
  });
});
