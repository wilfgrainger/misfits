import { Hono } from 'hono';
import type { Env } from './env';
import { createAuthRoutes } from './routes/auth';
import { createAdminRoutes } from './routes/admin';
import { createProfileRoutes } from './routes/profile';
import { createLeagueRoutes } from './routes/leagues';
import { createAdminLeagueRoutes } from './routes/admin-leagues';
import { createResultRoutes } from './routes/results';
import { createCompetitionRoutes } from './routes/competition';
import { createSeasonMembershipRoutes } from './routes/season-memberships';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', async (c) => {
  if (!c.env.DB) return c.json({ ok: true });
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 503);
  }
});
app.route('/', createAuthRoutes());
app.route('/', createAdminRoutes());
app.route('/', createProfileRoutes());
app.route('/', createLeagueRoutes());
app.route('/', createAdminLeagueRoutes());
app.route('/', createResultRoutes());
app.route('/', createCompetitionRoutes());
app.route('/', createSeasonMembershipRoutes());

export default app;
