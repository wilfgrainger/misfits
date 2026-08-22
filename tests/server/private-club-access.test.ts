import { describe, expect, it } from 'vitest';
import { publicUser } from '../../src/server/db/users';

describe('private club membership contract', () => {
  it('exposes permanent club membership state separately from account status', () => {
    const user = publicUser({
      id: 'user-1',
      username: null,
      role: 'PLAYER',
      status: 'ACTIVE',
      club_status: 'PENDING',
      profile_image_url: null,
      darts_counter_url: null,
      is_master_admin: 0,
    } as never);

    expect(user).toMatchObject({
      id: 'user-1',
      status: 'ACTIVE',
      clubStatus: 'PENDING',
    });
  });
});
