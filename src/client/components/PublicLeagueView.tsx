import { useEffect, useState } from 'react';
import { ApiClient, type LeagueSummary, type PublicFixtureSummary } from '../api';
import { leagueScoringSummary } from '../scoring';
import { LoadFailure } from './LoadFailure';

const api = new ApiClient();

function fixtureLabel(status: PublicFixtureSummary['status']): string {
  if (status === 'PENDING_CONFIRMATION') return 'Awaiting confirmation';
  if (status === 'CONFIRMED') return 'Completed';
  if (status === 'DISPUTED') return 'Under review';
  if (status === 'VOID') return 'Void';
  return 'Outstanding';
}

function fixtureDetail(fixture: PublicFixtureSummary): string {
  const result = fixture.result;
  if (result && result.playerALegs !== null && result.playerBLegs !== null) {
    return `${result.playerALegs}-${result.playerBLegs} · ${result.playerAAverage?.toFixed(2) ?? '—'} / ${result.playerBAverage?.toFixed(2) ?? '—'} avg`;
  }
  if (fixture.status === 'VOID') return 'This fixture was voided by the club.';
  if (fixture.status === 'DISPUTED') return 'The result is under club review.';
  if (fixture.status === 'PENDING_CONFIRMATION') return 'The result is waiting for opponent confirmation.';
  return 'No result recorded yet.';
}

export function PublicLeagueView({ league, leagueKey }: { league: LeagueSummary; leagueKey: string }) {
  const [fixtures, setFixtures] = useState<PublicFixtureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.publicFixtures(leagueKey).then((payload) => {
      if (active) setFixtures(payload.fixtures);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Public fixtures could not be loaded.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [leagueKey, reloadKey]);

  const completed = fixtures.filter((fixture) => fixture.status === 'CONFIRMED').length;
  const outstanding = fixtures.filter((fixture) => fixture.status === 'OUTSTANDING').length;

  return <section className="public-league-view" aria-labelledby="public-league-title">
    <header className="public-league-heading">
      <p className="entry-kicker">Public fixture board</p>
      <h1 id="public-league-title">{league.name}</h1>
      <p>{league.seasonName} season · {league.status === 'OPEN' ? 'In progress' : 'Completed'}</p>
    </header>
    <section className="public-league-rules" aria-label="League rules">
      <strong>League rules</strong>
      <span>{leagueScoringSummary(league)}</span>
    </section>
    <section className="public-fixture-section" aria-labelledby="public-fixtures-title">
      <div className="section-heading"><div><p className="club-section-kicker">Schedule</p><h2 id="public-fixtures-title">Fixtures</h2></div><span className="status-label">{completed} completed · {outstanding} outstanding</span></div>
      {loading && <p className="loading-message">Loading fixtures...</p>}
      {error && <LoadFailure message={error} retryLabel="Try loading fixtures again" onRetry={() => setReloadKey((current) => current + 1)} />}
      {!loading && !error && fixtures.length === 0 && <p className="empty-message">No public fixtures have been published yet.</p>}
      {!loading && !error && fixtures.length > 0 && <ul className="public-fixture-list">{fixtures.map((fixture, index) => <li key={`${fixture.round}:${fixture.meetingNumber}:${index}`}><div><strong>{fixture.playerAUsername ?? 'Player'} vs {fixture.playerBUsername ?? 'Player'}</strong><small>Round {fixture.round} · Meeting {fixture.meetingNumber}</small><span>{fixtureDetail(fixture)}</span></div><span className={`status-label status-${fixture.status.toLowerCase()}`}>{fixtureLabel(fixture.status)}</span></li>)}</ul>}
    </section>
    <p className="privacy-note">Only the club's deliberately public fixture schedule is shown here. Private account and member details stay protected.</p>
  </section>;
}
