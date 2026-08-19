import { describe, expect, it } from 'vitest';
import worker from '../../src/server/index';

describe('GET /api/health', () => {
  it('returns a stable health response', async () => {
    const response = await worker.fetch(
      new Request('https://misfits.test/api/health'),
      {} as never,
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
