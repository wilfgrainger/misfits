import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiClientError, type AdminPlayerDto, type PlayerResultDto } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';

export function AdminResultsPage() {
  const [results, setResults] = useState<PlayerResultDto[]>([]);
  const [players, setPlayers] = useState<AdminPlayerDto[]>([]);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [playerALegs, setPlayerALegs] = useState(3);
  const [playerBLegs, setPlayerBLegs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [resultResponse, playerResponse] = await Promise.all([api.getAdminResults(), api.getAdminPlayers()]);
    setResults(resultResponse.results);
    setPlayers(playerResponse.players.filter((player) => player.leagueActive && player.status === 'ACTIVE' && player.username));
  }, []);
  useEffect(() => { void load().catch((reason) => setError(reason instanceof ApiClientError ? reason.message : 'Results could not be loaded.')); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createAdminResult({ playerAId, playerBId, playerALegs, playerBLegs });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'Result could not be created.');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this result? This changes the league table.')) return;
    setError(null);
    try {
      await api.deleteAdminResult(id);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'Result could not be deleted.');
    }
  }

  return (
    <section className="admin-section">
      <h2>Results</h2>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      <form className="panel admin-result-form" onSubmit={(event) => void create(event)}>
        <h3>Enter result manually</h3>
        <label>Player A<select value={playerAId} onChange={(event) => setPlayerAId(event.target.value)} required><option value="">Choose</option>{players.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}</select></label>
        <label>Player A legs<input type="number" min="0" value={playerALegs} onChange={(event) => setPlayerALegs(Number(event.target.value))} /></label>
        <label>Player B<select value={playerBId} onChange={(event) => setPlayerBId(event.target.value)} required><option value="">Choose</option>{players.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}</select></label>
        <label>Player B legs<input type="number" min="0" value={playerBLegs} onChange={(event) => setPlayerBLegs(Number(event.target.value))} /></label>
        <button className="primary-button" type="submit">Add confirmed result</button>
      </form>
      <div className="admin-card-list">
        {results.map((result) => (
          <article className="panel admin-result-row" key={result.id}>
            <div><strong>{result.playerAUsername} {result.playerALegs} - {result.playerBLegs} {result.playerBUsername}</strong><StatusBadge status={result.status} /></div>
            <button type="button" className="danger-button" onClick={() => void remove(result.id)}>Delete result</button>
          </article>
        ))}
      </div>
    </section>
  );
}
