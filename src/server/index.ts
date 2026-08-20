import { Hono } from 'hono';
import type { Env } from './env';
import { createAuthRoutes } from './routes/auth';
import { createAdminRoutes } from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/', createAuthRoutes());
app.route('/', createAdminRoutes());

export default app;
