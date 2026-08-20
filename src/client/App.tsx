import { FormEvent, useEffect, useState } from 'react';
import { ApiClient, ApiClientError, type AdminPlayer, type AdminPlayerChanges, type AuthPayload, type UserSummary } from './api';
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
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [playerAction, setPlayerAction] = useState<string | null>(null);

  const loadAdminPlayers = async () => {
    setPlayersLoading(true);
    setWorkspaceError('');
    try {
      setPlayers((await api.adminPlayers()).players);
    } catch (error) {
      setWorkspaceError(messageFor(error, 'The player list could not be loaded.'));
    } finally {
      setPlayersLoading(false);
    }
  };

  const applyAuth = (payload: AuthPayload) => {
    setUser(payload.user);
    setView(payload.requiresOnboarding ? 'onboarding' : 'signed-in');
    setMessage(payload.requiresOnboarding
      ? 'Choose the name your club will see.'
      : payload.user.role === 'ADMIN' ? 'Your league desk is ready.' : 'You are signed in.');
    if (!payload.requiresOnboarding && payload.user.role === 'ADMIN') void loadAdminPlayers();
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
    setPlayers([]);
    setWorkspaceError('');
    setView('signed-out');
    setMessage('You are signed out.');
  };

  const updatePlayer = async (id: string, changes: AdminPlayerChanges) => {
    setPlayerAction(id);
    setWorkspaceError('');
    try {
      const result = await api.updateAdminPlayer(id, changes);
      setPlayers((current) => current.map((player) => player.id === id ? result.player : player));
      setMessage('Player access updated.');
    } catch (error) {
      setWorkspaceError(messageFor(error, 'That player change could not be saved.'));
    } finally {
      setPlayerAction(null);
    }
  };

  const renderAdminWorkspace = () => {
    if (!user || user.role !== 'ADMIN') return null;
    return (
      <div className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-heading">
          <div>
            <p className="workspace-kicker">LEAGUE CONTROL</p>
            <h2 id="workspace-title">Admin desk</h2>
          </div>
          <button className="refresh-button" type="button" onClick={() => void loadAdminPlayers()} disabled={playersLoading}>
            {playersLoading ? 'Loading' : 'Refresh'}
          </button>
        </div>
        <p className="workspace-copy">Manage who can enter the 2026 open league. Promote trusted players to administrators or suspend access when needed.</p>
        <div className="workspace-summary" aria-label="League summary">
          <span><strong>{players.length}</strong> {players.length === 1 ? 'player' : 'players'}</span>
          <span><strong>{players.filter((player) => player.role === 'ADMIN').length}</strong> {players.filter((player) => player.role === 'ADMIN').length === 1 ? 'administrator' : 'administrators'}</span>
        </div>
        {workspaceError && <p className="workspace-error" role="alert">{workspaceError}</p>}
        {playersLoading && players.length === 0 && <p className="workspace-loading">Loading player access...</p>}
        {!playersLoading && players.length === 0 && !workspaceError && <p className="workspace-loading">No players have joined yet.</p>}
        {players.length > 0 && (
          <ul className="player-list">
            {players.map((player) => {
              const isCurrentUser = player.id === user.id;
              const isBusy = playerAction === player.id;
              return (
                <li className="player-row" key={player.id}>
                  <div className="player-identity">
                    <strong>{player.username ?? 'Name pending'}</strong>
                    <span>{player.email}</span>
                  </div>
                  <div className="player-state">
                    <span className={`player-tag ${player.role === 'ADMIN' ? 'player-tag-admin' : ''}`}>{player.role === 'ADMIN' ? 'Admin' : 'Player'}</span>
                    <span className={`player-tag ${player.status === 'ACTIVE' ? 'player-tag-active' : 'player-tag-suspended'}`}>{player.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span>
                  </div>
                  <div className="player-actions">
                    {!isCurrentUser && <button className="action-button" type="button" disabled={isBusy} onClick={() => void updatePlayer(player.id, { role: player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN' })}>
                      {player.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                    </button>}
                    {!isCurrentUser && <button className="action-button" type="button" disabled={isBusy} onClick={() => void updatePlayer(player.id, { status: player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>
                      {player.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>}
                    {isCurrentUser && <span className="player-note">You</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <main className="shell" data-state={view}>
      <section className={`shell-panel ${view === 'signed-in' ? 'shell-panel-wide' : ''}`}>
        <div className="top-line">
          <p className="eyebrow">MISFITS 501</p>
          <span className="online-label">Online</span>
        </div>
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
            <div className="account-heading">
              <div>
                <p className="account-name">{user.username ?? 'Player'}</p>
                <p className="account-role">{user.role === 'ADMIN' ? 'League administrator' : 'League player'}</p>
              </div>
              <button className="secondary-button" type="button" onClick={logout}>Sign out</button>
            </div>
            {renderAdminWorkspace()}
          </div>
        )}

        {view !== 'signed-in' && <small className="shell-stamp">{view === 'loading' ? 'Loading' : 'Online'}</small>}
      </section>
    </main>
  );
}
