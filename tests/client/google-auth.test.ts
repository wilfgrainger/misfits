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
    const entry = document.createElement('div');
    const container = document.createElement('div');
    Object.defineProperty(entry, 'clientWidth', { configurable: true, value: 320 });
    entry.append(container);
    document.body.append(entry);
    const onCredential = vi.fn();
    const onClick = vi.fn();
    const cleanup = await new GoogleAuth('client-id').mountButton(container, onCredential, onClick);
    expect(google.accounts.id.renderButton).toHaveBeenCalledWith(container, expect.objectContaining({
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'center',
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
    entry.remove();
  });

  it('fits the Google button to the containing entry width within safe bounds', async () => {
    const google = window.google!;
    const cases = [
      { entryWidth: 180, expectedWidth: '200' },
      { entryWidth: 320, expectedWidth: '320' },
      { entryWidth: 460, expectedWidth: '400' },
    ];

    for (const { entryWidth, expectedWidth } of cases) {
      const entry = document.createElement('div');
      const slot = document.createElement('div');
      Object.defineProperty(entry, 'clientWidth', { configurable: true, value: entryWidth });
      entry.append(slot);
      document.body.append(entry);

      await new GoogleAuth('client-id').mountButton(slot, vi.fn(), vi.fn());

      expect(google.accounts.id.renderButton).toHaveBeenLastCalledWith(slot, expect.objectContaining({ width: expectedWidth }));
      entry.remove();
    }
  });

  it('uses the actual sign-in slot when admission-card padding makes it narrower than its parent', async () => {
    const google = window.google!;
    const entry = document.createElement('div');
    const slot = document.createElement('div');
    Object.defineProperty(entry, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(slot, 'clientWidth', { configurable: true, value: 240 });
    entry.append(slot);
    document.body.append(entry);

    await new GoogleAuth('client-id').mountButton(slot, vi.fn(), vi.fn());

    expect(google.accounts.id.renderButton).toHaveBeenLastCalledWith(slot, expect.objectContaining({ width: '240' }));
    entry.remove();
  });
});
