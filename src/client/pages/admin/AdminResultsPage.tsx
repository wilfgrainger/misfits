import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiClientError, type AdminPlayerDto, type PlayerResultDto } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';

function ResultEditor({ result, onChanged, onDelete }: {
  result: PlayerResultDto;
  onChanged: () => Promise<void>;
  onDelete: (id: string, label: string) => Promise<void>;
}) {
  const [playerALegs, setPlayerALegs] = useState(result.playerALegs);
  const [playerBLegs, setPlayerBLegs] = useState(result.playerBLegs);
  const [status, setStatus] = useState<'CONFIRMED' | 'DISPUTED'>(result.status === 'DISPUTED' ? 'DISPUTED' : 'CONFIRMED');
  const [disputeNote, setDisputeNote] = useState(result.disputeNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = `${result.playerAUsername} vs ${result.playerBUsername}`;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api.updateAdminResult(result.id, {
        playerALegs,
        playerBLegs,
        status,
        disputeNote: status === 'DISPUTED' ? disputeNote : null,
      });
      await onChanged();
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'Result could not be corrected.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel admin-result-editor">
      <div className="admin-result-row">
        <div>
          <strong>{result.playerAUsername} {result.playerALegs} - {result.playerBLegs} {result.playerBUsername}</strong>
          <StatusBadge status={result.status} />
        </div>
      </div>
      <div className="admin-grid-form admin-result-edit-grid">
        <label>
          Player A legs
          <input
            aria-label={`Player A legs for ${label}`}
            type="number"
            min="0"
            value={playerALegs}
            onChange={(event) => setPlayerALegs(Number(event.target.value))}
          />
        </label>
        <label>
          Player B legs
          <input
            aria-label={`Player B legs for ${label}`}
            type="number"
            min="0"
            value={playerBLegs}
            onChange={(event) => setPlayerBLegs(Number(event.target.value))}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as 'CONFIRMED' | 'DISPUTED')}>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </label>
        {status === 'DISPUTED' ? (
          <label>
            Dispute note
            <input value={disputeNote} maxLength={500} onChange={(event) => setDisputeNote(event.target.value)} />
          </label>
        ) : null}
      </div>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <div className="result-actions">
        <button type="button" className="secondary-button" disabled={saving} aria-label={`Save result ${label}`} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save result'}
        </button>
        <button type="button" className="danger-button" aria-label={`Delete result ${label}`} onClick={() => void onDelete(result.id, label)}>
          Delete result
        </button>
      </div>
    </article>
  );
}

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

  async function remove(id: string, label: string) {
    if (!window.confirm(`Delete ${label}? This changes the league table.`)) return;
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
        {results.map((result) => <ResultEditor key={result.id} result={result} onChanged={load} onDelete={remove} />)}
      </div>
    </section>
  );
}
