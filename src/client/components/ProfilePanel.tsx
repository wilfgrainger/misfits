import { FormEvent, useEffect, useState } from 'react';
import { ApiClient, type UserSummary } from '../api';

const api = new ApiClient();

interface ProfilePanelProps {
  user: UserSummary;
  onSaved: (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => void;
}

export function ProfilePanel({ user, onSaved }: ProfilePanelProps) {
  const [username, setUsername] = useState(user.username ?? '');
  const [dartsCounterUrl, setDartsCounterUrl] = useState(user.dartsCounterUrl ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(user.username ?? '');
    setDartsCounterUrl(user.dartsCounterUrl ?? '');
  }, [user.username, user.dartsCounterUrl]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await api.updateProfile({ username, dartsCounterUrl: dartsCounterUrl.trim() || null });
      onSaved({ username: result.profile.username, profileImageUrl: result.profile.profileImageUrl, dartsCounterUrl: result.profile.dartsCounterUrl });
      setMessage('Profile saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="content-section profile-section" aria-labelledby="profile-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">YOUR PROFILE</p>
          <h2 id="profile-title">Player card</h2>
        </div>
        <div className="avatar avatar-large">
          {user.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : (user.username ?? '?').slice(0, 1).toUpperCase()}
        </div>
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label htmlFor="profile-nickname">Nickname</label>
        <input id="profile-nickname" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="nickname" maxLength={24} required />
        <label htmlFor="profile-darts-link">Darts Counter profile</label>
        <input id="profile-darts-link" type="url" inputMode="url" value={dartsCounterUrl} onChange={(event) => setDartsCounterUrl(event.target.value)} placeholder="https://dartcounter.net/..." autoComplete="url" />
        <p className="form-help">Link your DartCounter profile so fellow club members can view your scoring stats.</p>
        <button className="primary-button" type="submit" disabled={saving} aria-busy={saving}>{saving ? 'Saving' : 'Save profile'}</button>
      </form>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {user.dartsCounterUrl && <a className="profile-link" href={user.dartsCounterUrl} target="_blank" rel="noreferrer">Open Darts Counter profile</a>}
    </section>
  );
}
