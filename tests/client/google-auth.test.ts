/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuth } from '../../src/client/auth/GoogleAuth';

describe('Google Identity Services client', () => {
  beforeEach(() => {
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          prompt: vi.fn(),
        },
      },
    };
  });

  it('initializes Google and resolves the returned credential', async () => {
    const google = window.google!;
    vi.mocked(google.accounts.id.initialize).mockImplementation((config) => {
      config.callback({ credential: 'credential-from-google' });
    });
    const credential = await new GoogleAuth('client-id').signIn();
    expect(credential).toBe('credential-from-google');
    expect(google.accounts.id.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-id' }));
    expect(google.accounts.id.prompt).toHaveBeenCalledOnce();
  });

  it('reports when Google does not display the prompt', async () => {
    vi.mocked(google.accounts.id.prompt).mockImplementation((notification) => {
      notification?.({ isNotDisplayed: () => true, getNotDisplayedReason: () => 'unregistered_origin' });
    });
    await expect(new GoogleAuth('client-id').signIn()).rejects.toThrow('Google sign-in is not enabled for this site');
  });
});
