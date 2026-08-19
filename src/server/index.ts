import { Hono } from 'hono';
import type { Env } from './env';
import { ApiError, errorPayload } from './errors';
import type { AppVariables } from './auth/guards';
import { createAuthRoutes, type AuthRouteDeps } from './routes/auth';
import { createPublicRoutes } from './routes/public';
import { createResultRoutes } from './routes/results';

export type AppDeps = AuthRouteDeps;
type AppEnv = { Bindings: Env; Variables: AppVariables };

export function createApp(deps: AppDeps = {}) {
  const app = new Hono<AppEnv>();

  app.onError((error, c) => {
    c.header('Cache-Control', 'private, no-store');
    if (error instanceof ApiError) {
      return c.json(errorPayload(error.code, error.message), error.status as 400);
    }
    console.error('Unhandled application error', error);
    return c.json(errorPayload('VALIDATION_ERROR', 'An unexpected error occurred.'), 500);
  });

  app.get('/api/health', (c) => c.json({ ok: true }));
  app.route('/', createAuthRoutes(deps));
  app.route('/', createPublicRoutes());
  app.route('/', createResultRoutes());
  return app;
}

export default createApp();
