import { Hono } from 'hono';
import { requireAdmin, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { copySeasonMembershipBaseline } from '../db/membership-baseline';
import { AppError, jsonError } from '../errors';

interface SeasonMembershipRouteDependencies {
  now?: () => Date;
}

export function createSeasonMembershipRoutes(dependencies: SeasonMembershipRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();
  const now = dependencies.now ?? (() => new Date());

  routes.post('/api/admin/seasons/:seasonId/members/copy', requireSameOrigin, requireUser, requireAdmin, async (c) => {
    const body = await c.req.json().catch(() => null) as { toSeasonId?: unknown } | null;
    if (typeof body?.toSeasonId !== 'string' || !body.toSeasonId) {
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Draft target season is required', 400));
    }
    try {
      const placements = await copySeasonMembershipBaseline(
        c.env.DB,
        c.get('user').id,
        c.req.param('seasonId'),
        body.toSeasonId,
        now(),
      );
      return c.json({ placements }, 201, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof AppError) return jsonError(c, error);
      return jsonError(c, new AppError('VALIDATION_ERROR', 'Draft baseline placements could not be copied', 400));
    }
  });

  return routes;
}
