import type { ProfileUpdate } from '../domain/profile';
import type { UserRecord } from './users';
import { getUserById } from './users';

export type ProfileRecord = Pick<UserRecord, 'id' | 'username' | 'profile_image_url' | 'darts_counter_url'>;

export async function getProfile(db: D1Database, userId: string): Promise<ProfileRecord | null> {
  return (await db.prepare(
    `SELECT id, username, profile_image_url, darts_counter_url
       FROM users WHERE id = ?`,
  ).bind(userId).first<ProfileRecord>()) ?? null;
}

export async function updateProfile(
  db: D1Database,
  userId: string,
  input: Required<Pick<ProfileUpdate, 'username' | 'dartsCounterUrl'>>,
): Promise<UserRecord> {
  await db.prepare('UPDATE users SET username = ?, darts_counter_url = ? WHERE id = ?')
    .bind(input.username, input.dartsCounterUrl, userId).run();
  const user = await getUserById(db, userId);
  if (!user) throw new Error('Profile user could not be loaded after update');
  return user;
}
