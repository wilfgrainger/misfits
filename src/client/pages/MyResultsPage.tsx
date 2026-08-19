import { useCallback, useEffect, useState } from 'react';
import { api, ApiClientError, type PlayerResultDto } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export function MyResultsPage() {
  const [results, setResults] = useState<PlayerResultDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await api.getMyResults();
    setResults(response.results);
  }, []);

  useEffect(() => {
    void load().catch((reason: unknown) => setError(reason instanceof ApiClientError ? reason.message : 'Your results could not be loaded.'));
  }, [load]);

  async function resolve(id: string, action: 'confirm' | 'dispute') {
    setError(null);
    setActingId(id);
    try {
      if (action === 'confirm') await api.confirmResult(id);
      else await api.disputeResult(id);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'The result could not be updated.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="page player-page">
      <header className="page-heading">
        <p className="eyebrow">Your record</p>
        <h1>My results</h1>
      </header>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      {results.length === 0 ? <p className="empty-state">No matches yet.</p> : (
        <ol className="player-result-list">
          {results.map((result) => (
            <li key={result.id} className="player-result-card">
              <div className="result-card-heading">
                <StatusBadge status={result.status} />
                <time dateTime={result.createdAt}>{new Date(result.createdAt).toLocaleDateString('en-GB')}</time>
              </div>
              <p className="player-result-score">
                <span>{result.playerAUsername}</span>
                <strong>{result.playerALegs} - {result.playerBLegs}</strong>
                <span>{result.playerBUsername}</span>
              </p>
              {result.disputeNote ? <p className="dispute-note">{result.disputeNote}</p> : null}
              {result.canRespond ? (
                <div className="result-actions">
                  <button type="button" className="primary-button" disabled={actingId === result.id} onClick={() => void resolve(result.id, 'confirm')}>Confirm</button>
                  <button type="button" className="secondary-button danger-button" disabled={actingId === result.id} onClick={() => void resolve(result.id, 'dispute')}>Dispute</button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
