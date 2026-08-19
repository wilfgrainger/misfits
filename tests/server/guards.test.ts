import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { requireSameOrigin } from '../../src/server/auth/guards';
import type { Env } from '../../src/server/env';

describe('same-origin mutation guard', () => {
  const app = new Hono<{ Bindings: Env }>();
  app.use('/write', requireSameOrigin);
  app.get('/write', (c) => c.json({ ok: true }));
  app.post('/write', (c) => c.json({ ok: true }));
  const env = { APP_ORIGIN: 'https://misfits.example' } as Env;

  it('allows safe requests without Origin', async () => {
    expect((await app.request('/write', { method: 'GET' }, env)).status).toBe(200);
  });

  it('allows a mutation from the application origin', async () => {
    const response = await app.request('/write', {
      method: 'POST',
      headers: { Origin: 'https://misfits.example' },
    }, env);
    expect(response.status).toBe(200);
  });

  it('rejects a mutation with a missing or foreign Origin', async () => {
    expect((await app.request('/write', { method: 'POST' }, env)).status).toBe(403);
    expect((await app.request('/write', {
      method: 'POST', headers: { Origin: 'https://evil.example' },
    }, env)).status).toBe(403);
  });
});
