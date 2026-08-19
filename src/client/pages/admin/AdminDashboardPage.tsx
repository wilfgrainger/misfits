import { useEffect, useState } from 'react';
import { api, ApiClientError, type AdminLeagueDto } from '../../api/client';

export function AdminDashboardPage() {
  const [data, setData] = useState<{ league: AdminLeagueDto; counts: { players: number; results: number; pending: number; disputed: number; confirmed: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.getAdminSummary().then(setData).catch((reason) => setError(reason instanceof ApiClientError ? reason.message : 'Admin data could not be loaded.'));
  }, []);
  return (
    <section className="admin-section" aria-labelledby="admin-dashboard-title">
      <h2 id="admin-dashboard-title">Admin dashboard</h2>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      {!data && !error ? <p>Loading…</p> : null}
      {data ? (
        <>
          <div className="admin-stats">
            <div><strong>{data.counts.players}</strong><span>Players</span></div>
            <div><strong>{data.counts.results}</strong><span>Results</span></div>
            <div><strong>{data.counts.pending}</strong><span>Pending</span></div>
            <div><strong>{data.counts.disputed}</strong><span>Disputed</span></div>
          </div>
          <div className="panel"><strong>{data.league.name}</strong><p>Season {data.league.season_name} · {data.league.status}</p></div>
        </>
      ) : null}
    </section>
  );
}
