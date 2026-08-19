import { useEffect, useState } from 'react';
import { api, ApiClientError, type AdminPlayerDto } from '../../api/client';

function PlayerEditor({ initial, onSaved }: { initial: AdminPlayerDto; onSaved: (player: AdminPlayerDto) => void }) {
  const [username, setUsername] = useState(initial.username ?? '');
  const [role, setRole] = useState(initial.role);
  const [status, setStatus] = useState(initial.status);
  const [leagueActive, setLeagueActive] = useState(initial.leagueActive);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = initial.username ?? initial.email;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const response = await api.updateAdminPlayer(initial.id, { username, role, status, leagueActive });
      onSaved(response.player);
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'Player could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel admin-player-card">
      <div className="admin-player-identity"><strong>{label}</strong><span>{initial.email}</span></div>
      <div className="admin-grid-form">
        <label>Username<input aria-label={`Username for ${label}`} value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Role<select aria-label={`Role for ${label}`} value={role} onChange={(event) => setRole(event.target.value as AdminPlayerDto['role'])}><option value="PLAYER">Player</option><option value="ADMIN">Admin</option></select></label>
        <label>Status<select aria-label={`Status for ${label}`} value={status} onChange={(event) => setStatus(event.target.value as AdminPlayerDto['status'])}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></label>
        <label className="checkbox-label"><input type="checkbox" checked={leagueActive} onChange={(event) => setLeagueActive(event.target.checked)} /> League active</label>
      </div>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <button type="button" className="secondary-button" disabled={saving} onClick={() => void save()}>Save {label}</button>
    </article>
  );
}

export function AdminPlayersPage() {
  const [players, setPlayers] = useState<AdminPlayerDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.getAdminPlayers().then((response) => setPlayers(response.players)).catch((reason) => setError(reason instanceof ApiClientError ? reason.message : 'Players could not be loaded.'));
  }, []);
  return (
    <section className="admin-section">
      <h2>Players</h2>
      <p className="muted">Email addresses are visible here to administrators only.</p>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      <div className="admin-card-list">
        {players?.map((player) => <PlayerEditor key={player.id} initial={player} onSaved={(saved) => setPlayers((current) => current?.map((p) => p.id === saved.id ? saved : p) ?? [])} />)}
      </div>
    </section>
  );
}
