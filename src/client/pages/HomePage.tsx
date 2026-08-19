import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api, ApiClientError, type PublicLeagueResponse } from '../api/client';
import { LeagueTable } from '../components/LeagueTable';
import { ResultList } from '../components/ResultList';
import { StatusBadge } from '../components/StatusBadge';
import type { PublicResultDto } from '../../shared/api';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const [league, setLeague] = useState<PublicLeagueResponse | null>(null);
  const [results, setResults] = useState<PublicResultDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    Promise.all([api.getPublicLeague(), api.getPublicResults(5)])
      .then(([leagueResponse, resultResponse]) => {
        if (!active) return;
        setLeague(leagueResponse);
        setResults(resultResponse.results);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof ApiClientError ? reason.message : 'League data is unavailable right now.');
      });
    return () => { active = false; };
  }, []);

  if (error) return <div className="page"><p role="alert" className="error-panel">{error}</p></div>;
  if (!league) return <div className="page"><p className="loading-state">Loading league…</p></div>;

  return (
    <main className="page home-page">
      <section className="league-heading" aria-labelledby="league-title">
        <div>
          <p className="eyebrow">Season {league.league.seasonName}</p>
          <h1 id="league-title">{league.league.name}</h1>
        </div>
        <StatusBadge status={league.league.status} />
      </section>

      <section aria-labelledby="table-title" className="panel">
        <div className="section-heading">
          <h2 id="table-title">League table</h2>
          <span>Race to {league.league.targetLegs} · {league.league.pointsPerWin} pts/win</span>
        </div>
        <LeagueTable rows={league.standings} />
      </section>

      <section aria-labelledby="latest-title" className="panel">
        <div className="section-heading">
          <h2 id="latest-title">Latest results</h2>
          <NavLink to="/results">View all</NavLink>
        </div>
        <ResultList results={results} />
      </section>

      <section className="home-action" aria-label="League action">
        {user ? <NavLink className="primary-button" to="/me">Open my league</NavLink> : <NavLink className="primary-button" to="/login">Sign in to add a result</NavLink>}
      </section>
    </main>
  );
}
