import { FormEvent, useEffect, useState } from 'react';
import { ApiClient, ApiClientError, type AuthPayload, type UserSummary } from './api';
import { GoogleAuth } from './auth/GoogleAuth';

type ViewState = 'loading' | 'signed-out' | 'entering' | 'onboarding' | 'signed-in';

const api = new ApiClient();

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [message, setMessage] = useState('Checking your league session...');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [username, setUsername] = useState('');

  const applyAuth = (payload: AuthPayload) => {
    setUser(payload.user);
    setView(payload.requiresOnboarding ? 'onboarding' : 'signed-in');
    setMessage(payload.requiresOnboarding ? 'Choose the name your club will see.' : 'You are signed in.');
  };

  useEffect(() => {
    let active = true;
    api.me().then((payload) => {
      if (!active) return;
      applyAuth(payload);
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiClientError && error.status === 401) {
        setView('signed-out');
        setMessage('Sign in to save your place in the league.');
      } else {
        setView('signed-out');
        setMessage('The league could not be reached. Try signing in again.');
      }
    });
    return () => { active = false; };
  }, []);

  const signIn = async () => {
    try {
      setView('entering');
      setMessage('Opening Google sign-in...');
      const credential = await new GoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').signIn();
      applyAuth(await api.signIn(credential));
    } catch (error) {
      setView('signed-out');
      setMessage(messageFor(error, 'Google sign-in could not be completed.'));
    }
  };

  const submitUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setView('entering');
      setMessage('Joining the league...');
      applyAuth(await api.setUsername(username));
    } catch (error) {
      setView('onboarding');
      setMessage(messageFor(error, 'That name could not be saved.'));
    }
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setView('signed-out');
    setMessage('You are signed out.');
  };

  return (
    <main className="shell" data-state={view}>
      <section className="shell-panel">
        <p className="eyebrow">MISFITS 501</p>
        <h1>Club darts, properly settled.</h1>
        <p className="intro">{message}</p>

        {view === 'signed-out' && <button className="google-button" type="button" onClick={signIn}>Continue with Google</button>}
        {view === 'onboarding' && (
          <form className="onboarding-form" onSubmit={submitUsername}>
            <label htmlFor="username">Player name</label>
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="nickname" maxLength={24} required />
            <button className="primary-button" type="submit">Join the league</button>
          </form>
        )}
        {view === 'signed-in' && user && (
          <div className="account-panel">
            <p className="account-name">{user.username ?? 'Player'}</p>
            <p className="account-role">{user.role === 'ADMIN' ? 'League administrator' : 'League player'}</p>
            <button className="secondary-button" type="button" onClick={logout}>Sign out</button>
          </div>
        )}

        <small className="shell-stamp">{view === 'loading' ? 'Loading' : 'Online'}</small>
      </section>
    </main>
  );
}
