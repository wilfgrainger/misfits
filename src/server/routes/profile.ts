import { Hono } from 'hono';
import { requireClubMember, requireSameOrigin, requireUser, type AuthAppEnv } from '../auth/guards';
import { validateProfileInput } from '../domain/profile';
import { AppError, jsonError } from '../errors';
import { getProfile, updateProfile } from '../db/profile';
import { getUserById, publicUser } from '../db/users';

interface ProfileRouteDependencies {
  now?: () => Date;
}

export function createProfileRoutes(_dependencies: ProfileRouteDependencies = {}) {
  const routes = new Hono<AuthAppEnv>();

  routes.get('/api/me/profile', requireUser, requireClubMember, async (c) => {
    const profile = await getProfile(c.env.DB, c.get('user').id);
    if (!profile) return jsonError(c, new AppError('UNAUTHENTICATED', 'Sign-in is required', 401));
    return c.json({
      profile: {
        username: profile.username,
        profileImageUrl: profile.profile_image_url,
        dartsCounterUrl: profile.darts_counter_url,
      },
    }, 200, { 'Cache-Control': 'private, no-store' });
  });

  routes.patch('/api/me/profile', requireSameOrigin, requireUser, requireClubMember, async (c) => {
    const body = await c.req.json().catch(() => null);
    const validation = validateProfileInput(body);
    if (!validation.ok) return jsonError(c, new AppError('PROFILE_INVALID', 'Profile details are not valid', 400));
    const current = await getUserById(c.env.DB, c.get('user').id);
    if (!current) return jsonError(c, new AppError('UNAUTHENTICATED', 'Sign-in is required', 401));
    const username = validation.value.username ?? current.username;
    if (!username) return jsonError(c, new AppError('PROFILE_INVALID', 'A nickname is required', 400));
    const dartsCounterUrl = validation.value.dartsCounterUrl === undefined
      ? current.darts_counter_url
      : validation.value.dartsCounterUrl;
    try {
      const updated = await updateProfile(c.env.DB, current.id, { username, dartsCounterUrl });
      return c.json({ profile: publicUser(updated) }, 200, { 'Cache-Control': 'private, no-store' });
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        return jsonError(c, new AppError('USERNAME_UNAVAILABLE', 'That nickname is already in use', 409));
      }
      return jsonError(c, new AppError('PROFILE_INVALID', 'Profile details could not be saved', 400));
    }
  });

  return routes;
}
