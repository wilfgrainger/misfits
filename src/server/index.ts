import { Hono } from 'hono';
import type { Env } from './env';
import { createAuthRoutes } from './routes/auth';
import { createAdminRoutes } from './routes/admin';
import { createProfileRoutes } from './routes/profile';
import { createLeagueRoutes } from './routes/leagues';
import { createAdminLeagueRoutes } from './routes/admin-leagues';
import { createResultRoutes } from './routes/results';
import { createCompetitionRoutes } from './routes/competition';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/', createAuthRoutes());
app.route('/', createAdminRoutes());
app.route('/', createProfileRoutes());
app.route('/', createLeagueRoutes());
app.route('/', createAdminLeagueRoutes());
app.route('/', createResultRoutes());
app.route('/', createCompetitionRoutes());

export default app;
