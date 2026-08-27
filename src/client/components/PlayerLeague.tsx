import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient, type FixtureSummary, type LeagueDetail, type LeagueSummary, type PlayerMovementStatus, type ResultSummary, type StandingRow, type UserSummary } from '../api';
import { effectiveMaxLegs, leagueScoringSummary, legsToWin, matchFormatDescription, resultOutcomeLabel, TABLE_TIE_BREAK_DESCRIPTION } from '../scoring';
import { AppIcon } from './AppIcons';
import { LoadFailure } from './LoadFailure';
import { ProfilePanel } from './ProfilePanel';
import { StandingsTable } from './StandingsTable';

const api = new ApiClient();
type PlayerView = 'table' | 'record' | 'fixtures' | 'results' | 'more';
type MoreView = 'menu' | 'players' | 'profile';
export type EmbeddedLeagueView = 'table' | 'record' | 'fixtures' | 'results';

interface PlayerLeagueProps {
  user: UserSummary;
  league: LeagueSummary;
  isParticipant: boolean;
  onUserSaved: (user: UserSummary) => void;
  onOpenAdmin?: () => void;
  onSignOut: () => void;
  embedded?: boolean;
  embeddedView?: EmbeddedLeagueView;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function fixtureStatusLabel(status: FixtureSummary['status']): string {
  if (status === 'PENDING_CONFIRMATION') return 'Awaiting confirmation';
  if (status === 'CONFIRMED') return 'Completed';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function fixtureScore(fixture: FixtureSummary): string | null {
  if (fixture.playerALegs === null || fixture.playerBLegs === null) return null;
  return `${fixture.playerALegs}-${fixture.playerBLegs} · ${fixture.playerAAverage?.toFixed(2) ?? '—'} / ${fixture.playerBAverage?.toFixed(2) ?? '—'} avg`;
}

function fixtureProgress(fixtures: FixtureSummary[]) {
  const confirmed = fixtures.filter((fixture) => fixture.status === 'CONFIRMED').length;
  const outstanding = fixtures.filter((fixture) => fixture.status === 'OUTSTANDING').length;
  const pending = fixtures.filter((fixture) => fixture.status === 'PENDING_CONFIRMATION').length;
  const disputed = fixtures.filter((fixture) => fixture.status === 'DISPUTED').length;
  const voided = fixtures.filter((fixture) => fixture.status === 'VOID').length;
  return { confirmed, outstanding, pending, disputed, voided, activeTotal: fixtures.length - voided };
}

function fixtureContext(fixture: FixtureSummary, userId: string): string {
  const score = fixtureScore(fixture);
  if (fixture.status === 'PENDING_CONFIRMATION') return `${score ? `Submitted score: ${score}. ` : ''}${fixture.submittedBy === userId ? 'Waiting for your opponent to confirm.' : 'Your review is needed in Results.'}`;
  if (fixture.status === 'DISPUTED') return `${score ? `Submitted score: ${score}. ` : ''}${fixture.disputeNote ? `Disputed: ${fixture.disputeNote}` : 'Disputed for administrator review.'}`;
  if (fixture.status === 'VOID') return 'Void fixture; it does not affect the table and cannot receive a result.';
  return fixtureScore(fixture) ?? 'No score recorded yet.';
}

function ResultRow({ result, user, onResolve }: { result: ResultSummary; user: UserSummary; onResolve: (result: ResultSummary) => void }) {
  const isPlayerA = result.playerAId === user.id;
  const outcome = resultOutcomeLabel(result.playerALegs, result.playerBLegs, result.playerAUsername, result.playerBUsername);
  return (
    <div className="result-row">
      <div className="result-main">
        <strong>{result.playerAUsername ?? 'Player'} <span>{result.playerALegs}</span></strong>
        <span className="result-divider">-</span>
        <strong>{result.playerBUsername ?? 'Player'} <span>{result.playerBLegs}</span></strong>
      </div>
      <div className="result-meta">
        <span>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</span>
        <span>{displayDate(result.createdAt)}</span>
      </div>
      {result.status !== 'CONFIRMED' && <span className={`status-label status-${result.status.toLowerCase()}`}>{result.status}</span>}
      {result.status === 'PENDING' && !isPlayerA && result.submittedBy !== user.id && <button className="action-button" type="button" onClick={() => onResolve(result)}>Review result</button>}
      {result.status === 'DISPUTED' && result.disputeNote && <p className="dispute-note">{result.disputeNote}</p>}
      {result.status === 'CONFIRMED' && <span className="result-winner">{outcome}</span>}
    </div>
  );
}

export function PlayerLeague({ user, league, isParticipant, onUserSaved, onOpenAdmin, onSignOut, embedded = false, embeddedView }: PlayerLeagueProps) {
  const maxLegs = effectiveMaxLegs(league);
  const targetLegs = legsToWin(maxLegs);
  const [view, setView] = useState<PlayerView>(embeddedView ?? 'table');
  const [moreView, setMoreView] = useState<MoreView>('menu');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [myResults, setMyResults] = useState<ResultSummary[]>([]);
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [myFixtures, setMyFixtures] = useState<FixtureSummary[]>([]);
  const [movement, setMovement] = useState<PlayerMovementStatus | null>(null);
  const [detail, setDetail] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [playerALegs, setPlayerALegs] = useState('');
  const [playerBLegs, setPlayerBLegs] = useState('');
  const [playerAAverage, setPlayerAAverage] = useState('');
  const [playerBAverage, setPlayerBAverage] = useState('');
  const [busyResult, setBusyResult] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const loadRequest = useRef(0);
  const disputeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const disputeDialogRef = useRef<HTMLFormElement | null>(null);
  const disputeNoteRef = useRef<HTMLTextAreaElement | null>(null);
  const disputeWasOpen = useRef(false);

  const load = async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError('');
    setLoadError('');
    try {
      const [standingPayload, resultPayload, detailPayload, mine, fixturePayload, myFixturePayload, movementPayload] = await Promise.all([
        api.standings(league.id),
        api.results(league.id),
        api.publicLeague(league.id),
        api.myResults(),
        api.memberFixtures(league.id),
        api.myFixtures(league.id),
        league.seasonId ? api.playerMovement(league.seasonId).catch(() => null) : Promise.resolve(null),
      ]);
      if (request !== loadRequest.current) return;
      setStandings(standingPayload.standings);
      setResults(resultPayload.results);
      setDetail(detailPayload.league);
      setMyResults(mine.results.filter((result) => result.leagueId === league.id));
      setFixtures(fixturePayload.fixtures ?? []);
      setMyFixtures(myFixturePayload.fixtures ?? []);
      setMovement(movementPayload);
    } catch (cause) {
      if (request === loadRequest.current) setLoadError(cause instanceof Error ? cause.message : 'League data could not be loaded.');
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [league.id]);

  const pendingForReview = myResults.filter((result) => result.status === 'PENDING' && result.submittedBy !== user.id);
  const submittedPending = myResults.filter((result) => result.status === 'PENDING' && result.submittedBy === user.id);
  const canRecord = league.status === 'OPEN' && isParticipant;
  const availableFixtures = useMemo(() => myFixtures.filter((fixture) => fixture.status === 'OUTSTANDING'), [myFixtures]);
  const selectedFixture = myFixtures.find((fixture) => fixture.id === selectedFixtureId) ?? null;
  const myFixtureProgress = useMemo(() => fixtureProgress(myFixtures), [myFixtures]);
  const leagueFixtureProgress = useMemo(() => fixtureProgress(fixtures), [fixtures]);

  useEffect(() => {
    setView(embeddedView ?? 'table');
    setMoreView('menu');
    setSelectedFixtureId(null);
    setPlayerALegs('');
    setPlayerBLegs('');
    setPlayerAAverage('');
    setPlayerBAverage('');
  }, [league.id, targetLegs]);

  useEffect(() => {
    if (embedded && embeddedView) setView(embeddedView);
  }, [embedded, embeddedView]);

  useEffect(() => {
    if (disputeId) {
      disputeWasOpen.current = true;
      disputeNoteRef.current?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setDisputeId(null);
          setDisputeNote('');
          return;
        }
        if (event.key !== 'Tab') return;
        const controls = disputeDialogRef.current?.querySelectorAll<HTMLElement>('textarea, button:not([disabled])');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
    if (disputeWasOpen.current) {
      disputeWasOpen.current = false;
      disputeTriggerRef.current?.focus();
    }
  }, [disputeId]);

  const chooseFixture = (fixture: FixtureSummary) => {
    setSelectedFixtureId(fixture.id);
    setError('');
    setNotice('');
  };

  const submitResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRecord || !selectedFixtureId) return;
    setBusyResult('new');
    setError('');
    setNotice('');
    try {
      await api.submitFixtureResult(league.id, {
        fixtureId: selectedFixtureId,
        playerALegs: user.id === selectedFixture?.playerAId ? Number(playerALegs) : Number(playerBLegs),
        playerBLegs: user.id === selectedFixture?.playerAId ? Number(playerBLegs) : Number(playerALegs),
        playerAAverage: user.id === selectedFixture?.playerAId ? Number(playerAAverage) : Number(playerBAverage),
        playerBAverage: user.id === selectedFixture?.playerAId ? Number(playerBAverage) : Number(playerAAverage),
      });
      setNotice('Result sent to your opponent.');
      setSelectedFixtureId(null);
      setPlayerALegs('');
      setPlayerBLegs('');
      setPlayerAAverage('');
      setPlayerBAverage('');
      await load();
      setView('record');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be recorded.');
    } finally {
      setBusyResult(null);
    }
  };

  const confirm = async (result: ResultSummary) => {
    setBusyResult(result.id);
    try { await api.confirmResult(result.id); setNotice('Result confirmed.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be confirmed.'); }
    finally { setBusyResult(null); }
  };

  const submitDispute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disputeId) return;
    setBusyResult(disputeId);
    try { await api.disputeResult(disputeId, disputeNote); setNotice('Result disputed for admin review.'); setDisputeId(null); setDisputeNote(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be disputed.'); }
    finally { setBusyResult(null); }
  };

  const saveUser = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => onUserSaved({ ...user, ...profile });
  const showMore = (next: MoreView = 'menu') => { setMoreView(next); setView('more'); };

  return (
    <section className={embedded ? 'player-workspace league-experience embedded-league-experience' : 'player-workspace league-experience'} aria-labelledby="league-title">
      {embedded ? (
        <header className="competition-heading">
          <div><p className="competition-eyebrow">{league.seasonName} season</p><h2 id="league-title" title={league.name}>{league.name}</h2></div>
          <button className="refresh-button icon-action" type="button" aria-label="Refresh league" onClick={() => void load()} disabled={loading}><AppIcon name="refresh" /></button>
        </header>
      ) : <>
        <section className="league-heading player-league-hero">
          <div className="league-hero-copy">
            <div className="league-title-line"><h2 id="league-title">{league.name}</h2><span className={`status-label status-${league.status.toLowerCase()}`}>{league.status}</span></div>
            <p className="league-season">{league.seasonName} Season</p>
          </div>
          <button className="refresh-button icon-action" type="button" aria-label="Refresh league" onClick={() => void load()} disabled={loading}><AppIcon name="refresh" /></button>
          <div className="league-target-mark" aria-hidden="true"><AppIcon name="target" /></div>
          <div className="league-hero-meta"><span><AppIcon name="users" />{detail?.players?.length ?? '—'} Players</span><span><AppIcon name="calendar" />{league.status === 'OPEN' ? 'Season in progress' : 'Season closed'}</span><span><AppIcon name="target" />501 format</span></div>
        </section>
        <section className="season-rules-stack rules-card" aria-label="League rules"><span className="surface-icon"><AppIcon name="rules" /></span><div><p className="season-rules">{leagueScoringSummary(league)}</p><p className="form-help rules-tiebreak">{TABLE_TIE_BREAK_DESCRIPTION}</p></div></section>
      </>}

      {embedded && <section className="season-rules-stack rules-card embedded-rules-card" aria-label="League rules"><span className="surface-icon"><AppIcon name="rules" /></span><div><p className="season-rules">{leagueScoringSummary(league)}</p><p className="form-help rules-tiebreak">{TABLE_TIE_BREAK_DESCRIPTION}</p></div></section>}

      {!loading && !loadError && movement && (movement.movement || movement.ambiguity) && <section className="movement-card" aria-label="Season movement"><div className="experience-section-heading"><div><p className="club-section-kicker">Season movement</p><h3>{movement.state === 'CONFIRMED' ? 'Confirmed destination' : movement.state === 'APPROVED' ? 'Approved destination' : movement.state === 'PROPOSED' ? 'Movement awaiting final application' : 'Projected movement'}</h3></div><span className="status-label">{movement.state === 'PROVISIONAL' ? 'Provisional' : movement.state === 'CONFIRMED' ? 'Confirmed' : movement.state === 'APPROVED' ? 'Approved' : 'Under review'}</span></div>{movement.movement && <p className="movement-route"><strong>{movement.movement.fromLeagueName ?? league.name}</strong><span aria-hidden="true">→</span><strong>{movement.movement.toLeagueName ?? 'Next league to be confirmed'}</strong>{movement.movement.toSeasonName && <small>{movement.movement.toSeasonName} season</small>}</p>}{movement.ambiguity && <p className="form-help movement-warning">Movement boundary unresolved at position {movement.ambiguity.position}; the projection remains provisional.</p>}</section>}

      {notice && <p className="success-message compact-message" role="status">{notice}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {loadError && <LoadFailure message={loadError} retryLabel="Try loading this competition again" onRetry={() => void load()} />}
      {loading && <p className="loading-message">Loading league data...</p>}

      {!loading && !loadError && view === 'table' && <section className="standings-card" aria-labelledby="player-standings-title"><div className="experience-section-heading"><div className="section-title-with-icon"><span className="surface-icon surface-icon-small"><AppIcon name="results" /></span><h3 id="player-standings-title">Standings</h3></div></div><StandingsTable standings={standings} label={`${league.name} ${league.seasonName} standings`} highlightPlayerId={user.id} promotionPlaces={league.promotionPlaces} relegationPlaces={league.relegationPlaces} movementProvisional={movement?.provisional ?? true} />{(league.promotionPlaces ?? 0) > 0 || (league.relegationPlaces ?? 0) > 0 ? <p className="form-help movement-legend">{movement?.provisional === false ? 'Movement zones are final for this season.' : 'Promotion and relegation zones are provisional until the season is finalised.'}</p> : null}{standings.length === 0 && <div className="experience-empty"><AppIcon name="target" /><strong>No table movement yet</strong><span>Confirmed results will settle the table here.</span></div>}</section>}

      {!loading && !loadError && view === 'fixtures' && <section className="competition-fixtures" aria-labelledby="competition-fixtures-title"><div className="experience-section-heading"><div><h3 id="competition-fixtures-title">Fixtures</h3><p className="form-help">{fixtures.length > 0 ? `Your progress: ${myFixtureProgress.confirmed} confirmed of ${myFixtureProgress.activeTotal} active fixtures · ${myFixtureProgress.outstanding} outstanding · ${myFixtureProgress.pending} pending · ${myFixtureProgress.disputed} disputed${myFixtureProgress.voided ? ` · ${myFixtureProgress.voided} void` : ''}. League: ${leagueFixtureProgress.confirmed} confirmed of ${leagueFixtureProgress.activeTotal} active fixtures · ${leagueFixtureProgress.outstanding} outstanding · ${leagueFixtureProgress.pending} pending · ${leagueFixtureProgress.disputed} disputed${leagueFixtureProgress.voided ? ` · ${leagueFixtureProgress.voided} void` : ''}.` : 'The schedule is controlled by club administration.'}</p></div></div>{fixtures.length === 0 ? <div className="experience-empty"><AppIcon name="calendar" /><strong>No fixtures published yet</strong><span>When the schedule is generated, matches will appear here.</span></div> : <ul className="fixture-browser-list">{fixtures.map((fixture) => <li key={fixture.id} className={fixture.playerAId === user.id || fixture.playerBId === user.id ? 'fixture-row fixture-row-you' : 'fixture-row'}><div><strong>{fixture.playerAUsername ?? 'Player'} vs {fixture.playerBUsername ?? 'Player'}</strong><span>Round {fixture.round} · Meeting {fixture.meetingNumber}</span><small>{fixtureContext(fixture, user.id)}</small></div><span className={`status-label status-${fixture.status.toLowerCase()}`}>{fixtureStatusLabel(fixture.status)}</span></li>)}</ul>}</section>}

      {!loading && !loadError && view === 'record' && !isParticipant && <section className="result-form record-browse-only" aria-labelledby="record-browse-title"><div className="form-heading"><h3 id="record-browse-title">Record</h3><p className="form-help">You can browse this league, but you are not currently assigned to it. An admin must place you in the season before you can record results.</p></div></section>}

      {!loading && !loadError && view === 'record' && isParticipant && !selectedFixture && <section className="result-form fixture-record-picker" aria-labelledby="fixture-record-title"><div className="form-heading"><h3 id="fixture-record-title">Record your result</h3><p className="form-help">Choose an outstanding fixture from your schedule. Results cannot be added against an arbitrary opponent.</p></div>{!canRecord && <p className="empty-message">Result entry is unavailable while this league is closed.</p>}{availableFixtures.length === 0 ? <p className="empty-message">{myFixtures.length === 0 ? 'No fixtures have been published for this league yet.' : 'No outstanding fixtures need your score right now.'}</p> : <ul className="admin-list fixture-picker-list">{availableFixtures.map((fixture) => <li key={fixture.id}><div><strong>{fixture.playerAUsername ?? 'Player'} vs {fixture.playerBUsername ?? 'Player'}</strong><small>Round {fixture.round} · Meeting {fixture.meetingNumber}</small></div><button className="action-button" type="button" disabled={!canRecord} onClick={() => chooseFixture(fixture)}>Record this fixture</button></li>)}</ul>}</section>}

      {!loading && !loadError && view === 'record' && isParticipant && selectedFixture && <form className="result-form" onSubmit={submitResult}><div className="form-heading"><h3>Record your result</h3><p className="form-help">{matchFormatDescription(maxLegs)}</p></div>{!canRecord && <p className="empty-message">Result entry is unavailable while this league is closed.</p>}<div className="account-context selected-fixture-context"><strong>{selectedFixture.playerAUsername ?? 'Player'} vs {selectedFixture.playerBUsername ?? 'Player'}</strong><span>Round {selectedFixture.round} · Meeting {selectedFixture.meetingNumber}</span><button className="secondary-button" type="button" onClick={() => setSelectedFixtureId(null)}>Choose another fixture</button></div>
        <div className="form-grid"><label htmlFor="your-legs">Your legs<input id="your-legs" type="number" min="0" max={targetLegs} value={playerALegs} onChange={(event) => setPlayerALegs(event.target.value)} required disabled={!canRecord} /></label><label htmlFor="their-legs">Their legs<input id="their-legs" type="number" min="0" max={targetLegs} value={playerBLegs} onChange={(event) => setPlayerBLegs(event.target.value)} required disabled={!canRecord} /></label><label htmlFor="your-average">Your average<input id="your-average" type="number" min="0" max="200" step="0.01" value={playerAAverage} onChange={(event) => setPlayerAAverage(event.target.value)} required disabled={!canRecord} /></label><label htmlFor="their-average">Their average<input id="their-average" type="number" min="0" max="200" step="0.01" value={playerBAverage} onChange={(event) => setPlayerBAverage(event.target.value)} required disabled={!canRecord} /></label></div>
        <button className="primary-button" type="submit" disabled={!canRecord || busyResult === 'new' || !selectedFixtureId} aria-busy={busyResult === 'new'}>{!canRecord ? 'League closed' : busyResult === 'new' ? 'Sending' : 'Send for confirmation'}</button></form>}

      {!loading && !loadError && view === 'results' && <div className="result-feed"><h3>Confirmed games</h3><ul className="result-list">{results.map((result) => <li key={result.id}><ResultRow result={result} user={user} onResolve={confirm} /></li>)}</ul><h3 className="subsection-title">Results awaiting your review</h3><ul className="result-list">{pendingForReview.map((result) => <li className="review-row" key={result.id}><ResultRow result={result} user={user} onResolve={confirm} /><div className="review-actions"><button className="primary-button" type="button" disabled={busyResult === result.id} aria-busy={busyResult === result.id} onClick={() => void confirm(result)}>{busyResult === result.id ? 'Saving' : 'Confirm'}</button><button className="secondary-button" type="button" onClick={(event) => { disputeTriggerRef.current = event.currentTarget; setDisputeId(result.id); }}>Dispute</button></div></li>)}{pendingForReview.length === 0 && <li className="empty-message">No results need your review.</li>}</ul><h3 className="subsection-title">Your submitted results</h3><ul className="result-list">{submittedPending.map((result) => <li className="review-row" key={result.id}><ResultRow result={result} user={user} onResolve={confirm} /><p className="form-help">Waiting for opponent confirmation.</p></li>)}{submittedPending.length === 0 && <li className="empty-message">No submitted results are waiting.</li>}</ul></div>}

      {!embedded && !loading && view === 'more' && moreView === 'menu' && <nav className="player-more-actions more-menu" aria-label="More player options"><button type="button" className="player-more-action" onClick={() => showMore('players')}><AppIcon name="players" /><span>Players</span></button><button type="button" className="player-more-action" onClick={() => showMore('profile')}><AppIcon name="profile" /><span>Profile</span></button>{user.role === 'ADMIN' && onOpenAdmin && <button type="button" className="player-more-action" onClick={onOpenAdmin}><AppIcon name="settings" /><span>Admin</span></button>}<button type="button" className="player-more-action" onClick={onSignOut}><AppIcon name="logout" /><span>Sign out</span></button></nav>}
      {!embedded && !loading && view === 'more' && moreView === 'players' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><h3>Players</h3><ul className="club-player-list">{detail?.players?.map((player) => <li key={player.id}><div className="avatar">{player.profileImageUrl ? <img src={player.profileImageUrl} alt="" /> : (player.username ?? '?').slice(0, 1).toUpperCase()}</div><strong>{player.username ?? 'Name pending'}</strong>{player.id === user.id && <span className="you-label">You</span>}</li>)}</ul></div>}
      {!embedded && view === 'more' && moreView === 'profile' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><ProfilePanel user={user} onSaved={saveUser} /></div>}

      {!embedded && <nav className="member-app-nav" aria-label="Member workspace"><button type="button" className={view === 'table' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'table' ? 'page' : undefined} onClick={() => setView('table')}><AppIcon name="league" /><span>League</span></button><button type="button" className={view === 'record' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'record' ? 'page' : undefined} onClick={() => setView('record')}><AppIcon name="record" /><span>Record</span></button><button type="button" className={view === 'results' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'results' ? 'page' : undefined} onClick={() => setView('results')}><AppIcon name="results" /><span>Results</span></button><button type="button" className={view === 'more' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'more' ? 'page' : undefined} onClick={() => showMore('menu')}><AppIcon name="more" /><span>More</span></button></nav>}

      {disputeId && <div className="modal-backdrop"><form ref={disputeDialogRef} className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="dispute-title" onSubmit={submitDispute}><h3 id="dispute-title">Dispute result</h3><label htmlFor="dispute-note">What needs checking?</label><textarea ref={disputeNoteRef} id="dispute-note" maxLength={240} value={disputeNote} onChange={(event) => setDisputeNote(event.target.value)} required /><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setDisputeId(null); setDisputeNote(''); }}>Cancel</button><button className="primary-button" type="submit" disabled={busyResult === disputeId} aria-busy={busyResult === disputeId}>Send dispute</button></div></form></div>}
    </section>
  );
}
