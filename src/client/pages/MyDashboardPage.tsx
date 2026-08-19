import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api, ApiClientError, type PlayerResultDto } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function MyDashboardPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<PlayerResultDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getMyResults()
      .then((response) => { if (active) setResults(response.results); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof ApiClientError ? reason.message : 'Your results could not be loaded.'); });
    return () => { active = false; };
  }, []);

  const needsReview = useMemo(() => results.filter((result) => result.canRespond), [results]);
  const waiting = useMemo(() => results.filter((result) => result.status === 'PENDING' && !result.canRespond), [results]);

  return (
    <main className="page player-page">
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">Player dashboard</p>
          <h1>{user?.username ?? 'My league'}</h1>
        </div>
        <NavLink className="primary-button" to="/results/new">Add result</NavLink>
      </header>

      {error ? <p role="alert" className="error-panel">{error}</p> : null}

      <section className="dashboard-stats" aria-label="Result summary">
        <div><strong>{needsReview.length}</strong><span>Need your review</span></div>
        <div><strong>{waiting.length}</strong><span>Waiting on opponent</span></div>
        <div><strong>{results.length}</strong><span>Total matches</span></div>
      </section>

      <section className="panel" aria-labelledby="review-heading">
        <div className="section-heading">
          <h2 id="review-heading">Needs attention</h2>
          {needsReview.length ? <NavLink to="/my-results">Review result</NavLink> : null}
        </div>
        {needsReview.length === 0 ? <p className="empty-state">Nothing waiting for you.</p> : (
          <ol className="pending-list">
            {needsReview.map((result) => (
              <li key={result.id}>{result.playerAUsername} reported {result.playerALegs} - {result.playerBLegs}</li>
            ))}
          </ol>
        )}
      </section>

      <section className="home-action" aria-label="Player result links">
        <NavLink to="/my-results">View all my results</NavLink>
      </section>
    </main>
  );
}
