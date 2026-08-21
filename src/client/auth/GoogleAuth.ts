declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: {
            type: 'standard';
            theme: 'outline';
            size: 'large';
            text: 'signin_with';
            shape: 'rectangular';
            logo_alignment: 'left';
            locale: string;
            width: string;
            click_listener: () => void;
          }): void;
          prompt(notification?: (notification: { isNotDisplayed(): boolean; getNotDisplayedReason(): string }) => void): void;
        };
      };
    };
  }
}

let loader: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-league-board-google], script[data-misfits-google]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=en';
    script.async = true;
    script.defer = true;
    script.dataset.leagueBoardGoogle = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.append(script);
  });
  return loader;
}

export class GoogleAuth {
  constructor(private readonly clientId: string) {}

  async mountButton(
    parent: HTMLElement,
    onCredential: (credential: string) => void,
    onClick: () => void,
  ): Promise<() => void> {
    if (!this.clientId) throw new Error('Google sign-in is not configured for this build');
    await loadGoogleScript();
    let active = true;
    window.google!.accounts.id.initialize({
      client_id: this.clientId,
      callback: ({ credential }) => {
        if (active && credential) onCredential(credential);
      },
    });
    const width = Math.max(200, Math.min(400, Math.floor(parent.getBoundingClientRect().width || 400)));
    parent.replaceChildren();
    window.google!.accounts.id.renderButton(parent, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'en',
      width: String(width),
      click_listener: onClick,
    });
    return () => {
      active = false;
      parent.replaceChildren();
    };
  }

  async signIn(): Promise<string> {
    if (!this.clientId) throw new Error('Google sign-in is not configured for this build');
    await loadGoogleScript();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Google sign-in did not complete')), 120_000);
      const failForPrompt = (message: string) => {
        window.clearTimeout(timer);
        reject(new Error(message));
      };
      window.google!.accounts.id.initialize({
        client_id: this.clientId,
        callback: ({ credential }) => {
          window.clearTimeout(timer);
          credential ? resolve(credential) : reject(new Error('Google sign-in returned no credential'));
        },
      });
      window.google!.accounts.id.prompt((notification) => {
        if (!notification.isNotDisplayed()) return;
        const reason = notification.getNotDisplayedReason();
        failForPrompt(reason === 'unregistered_origin'
          ? 'Google sign-in is not enabled for this site. Add this site to the Google OAuth JavaScript origins.'
          : 'Google sign-in did not open in this browser.');
      });
    });
  }
}
