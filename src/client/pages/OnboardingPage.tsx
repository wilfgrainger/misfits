import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiClientError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function OnboardingPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.setUsername(normalizeUsername(username));
      await refresh();
      navigate('/me', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'Your username could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-card" aria-labelledby="onboarding-title">
        <p className="eyebrow">One last thing</p>
        <h1 id="onboarding-title">Choose your Misfits name</h1>
        <p>This is what the league sees. Your Google email stays private.</p>
        <form onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={24}
            autoComplete="nickname"
            aria-describedby={error ? 'username-error' : 'username-help'}
          />
          <p id="username-help" className="field-help">3–24 characters: letters, numbers, spaces, _ and -.</p>
          {error ? <p id="username-error" role="alert" className="field-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={saving || normalizeUsername(username).length < 3}>
            {saving ? 'Saving…' : 'Save username'}
          </button>
        </form>
      </section>
    </main>
  );
}
