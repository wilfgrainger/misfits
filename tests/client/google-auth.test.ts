/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuth } from '../../src/client/auth/GoogleAuth';

describe('Google Identity Services client', () => {
  beforeEach(() => {
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
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

  it('renders the official Google sign-in button in English and forwards its credential', async () => {
    const google = window.google!;
    const container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => ({ width: 320 }) });
    const onCredential = vi.fn();
    const onClick = vi.fn();
    const cleanup = await new GoogleAuth('client-id').mountButton(container, onCredential, onClick);
    expect(google.accounts.id.renderButton).toHaveBeenCalledWith(container, expect.objectContaining({
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'en',
      width: '320',
    }));
    const config = vi.mocked(google.accounts.id.initialize).mock.calls.at(-1)?.[0];
    config?.callback({ credential: 'credential-from-google-button' });
    expect(onCredential).toHaveBeenCalledWith('credential-from-google-button');
    const buttonConfig = vi.mocked(google.accounts.id.renderButton).mock.calls[0][1];
    buttonConfig.click_listener();
    expect(onClick).toHaveBeenCalledOnce();
    cleanup();
    expect(container.childNodes).toHaveLength(0);
  });
});
