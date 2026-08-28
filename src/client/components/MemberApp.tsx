import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient, type LeaguePlayer, type LeagueSummary, type PromotionMovement, type ResultSummary, type SeasonHistoryEntry, type UserSummary } from '../api';
import { AppIcon } from './AppIcons';
import { LoadFailure } from './LoadFailure';
import { MemberNavigation, type MemberDestination } from './MemberNavigation';
import { PlayerLeague, type EmbeddedLeagueView } from './PlayerLeague';
import { ProfilePanel } from './ProfilePanel';

const api = new ApiClient();
type MoreView = 'menu' | 'players' | 'profile' | 'history';

function CompetitionButton({ league, onOpen }: { league: LeagueSummary; onOpen: () => void }) {
  return (
    <button type="button" className="competition-row" onClick={onOpen}>
      <span className="competition-row-main">
        <strong>{league.name}</strong>
        <small>{league.seasonName} season</small>
      </span>
      <span className={`status-label status-${league.status.toLowerCase()}`}>{league.status}</span>
    </button>
  );
}

export function MemberApp({ user, clubLeagues, myLeagues, onUserSaved, onOpenAdmin, onSignOut, profileRequestKey = 0 }: {
  user: UserSummary;
  clubLeagues: LeagueSummary[];
  myLeagues: LeagueSummary[];
  onUserSaved: (user: UserSummary) => void;
  onOpenAdmin?: () => void;
  onSignOut: () => void;
  profileRequestKey?: number;
}) {
  const [destination, setDestination] = useState<MemberDestination>('home');
  const [focusedLeagueId, setFocusedLeagueId] = useState<string | null>(null);
  const [leagueView, setLeagueView] = useState<EmbeddedLeagueView>('table');
  const [recordLeagueId, setRecordLeagueId] = useState<string | null>(null);
  const [moreView, setMoreView] = useState<MoreView>('menu');
  const [players, setPlayers] = useState<LeaguePlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [history, setHistory] = useState<SeasonHistoryEntry[]>([]);
  const [historyMovements, setHistoryMovements] = useState<PromotionMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyLeague, setHistoryLeague] = useState<LeagueSummary | null>(null);
  const [historyLeagueView, setHistoryLeagueView] = useState<EmbeddedLeagueView>('table');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingReviewLeagueId, setPendingReviewLeagueId] = useState<string | null>(null);
  const seenProfileRequest = useRef(profileRequestKey);

  const eligibleRecordLeagues = useMemo(() => myLeagues.filter((league) => league.status === 'OPEN'), [myLeagues]);
  const focusedLeague = clubLeagues.find((league) => league.id === focusedLeagueId) ?? null;
  const recordLeague = eligibleRecordLeagues.find((league) => league.id === recordLeagueId)
    ?? (eligibleRecordLeagues.length === 1 ? eligibleRecordLeagues[0] : null);

  useEffect(() => {
    if (eligibleRecordLeagues.length === 1) setRecordLeagueId(eligibleRecordLeagues[0].id);
    else if (recordLeagueId && !eligibleRecordLeagues.some((league) => league.id === recordLeagueId)) setRecordLeagueId(null);
  }, [eligibleRecordLeagues, recordLeagueId]);

  useEffect(() => {
    if (profileRequestKey === seenProfileRequest.current) return;
    seenProfileRequest.current = profileRequestKey;
    setDestination('more');
    setMoreView('profile');
  }, [profileRequestKey]);

  useEffect(() => {
    if (clubLeagues.length === 0) {
      setPendingReviewCount(0);
      setPendingReviewLeagueId(null);
      return;
    }
    let active = true;
    void api.myResults().then(({ results }: { results: ResultSummary[] }) => {
      if (!active) return;
      const clubLeagueIds = new Set(clubLeagues.map((league) => league.id));
      const pending = results.filter((result) => result.status === 'PENDING' && result.submittedBy !== user.id && clubLeagueIds.has(result.leagueId));
      const firstLeague = clubLeagues.find((league) => pending.some((result) => result.leagueId === league.id));
      setPendingReviewCount(pending.length);
      setPendingReviewLeagueId(firstLeague?.id ?? null);
    }).catch(() => {
      if (!active) return;
      setPendingReviewCount(0);
      setPendingReviewLeagueId(null);
    });
    return () => { active = false; };
  }, [clubLeagues, user.id]);

  const selectDestination = (next: MemberDestination) => {
    setDestination(next);
    if (next === 'home') setFocusedLeagueId(null);
    if (next === 'leagues') {
      setFocusedLeagueId(null);
      setLeagueView('table');
    }
    if (next === 'more') setMoreView('menu');
  };

  const openCompetition = (league: LeagueSummary) => {
    setFocusedLeagueId(league.id);
    setLeagueView('table');
    setDestination('leagues');
  };

  const openPendingReview = () => {
    if (!pendingReviewLeagueId) return;
    setFocusedLeagueId(pendingReviewLeagueId);
    setLeagueView('results');
    setDestination('leagues');
  };

  const openPlayers = async () => {
    setMoreView('players');
    setPlayersError('');
    if (players.length > 0 || clubLeagues.length === 0) return;
    setPlayersLoading(true);
    try {
      const payloads = await Promise.all(clubLeagues.map((league) => api.publicLeague(league.id)));
      const byId = new Map<string, LeaguePlayer>();
      payloads.forEach((payload) => payload.players.forEach((player) => byId.set(player.id, player)));
      setPlayers([...byId.values()].sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '')));
    } catch (cause) {
      setPlayersError(cause instanceof Error ? cause.message : 'Players could not be loaded.');
    } finally {
      setPlayersLoading(false);
    }
  };

  const openHistory = async () => {
    setMoreView('history');
    setHistoryLeague(null);
    setHistoryError('');
    if (history.length > 0) return;
    setHistoryLoading(true);
    try {
      const payload = await api.seasonHistory();
      setHistory(payload.seasons);
      setHistoryMovements(payload.movements);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : 'Season history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveUser = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => onUserSaved({ ...user, ...profile });

  return (
    <section className="club-member-app">
      <div className="club-member-content">
        {destination === 'home' && <section className="club-home" aria-labelledby="club-home-title">
          <header className="club-page-heading"><p className="club-page-kicker">Misfits</p><h1 id="club-home-title">Good to see you, {user.username}.</h1></header>

          <section className="club-home-section club-home-primary" aria-labelledby="your-competitions-title">
            <div className="club-section-heading"><div><p className="club-section-kicker">Playing now</p><h2 id="your-competitions-title">Your competitions</h2></div>{clubLeagues.length > 0 && <button type="button" className="text-button" onClick={() => selectDestination('leagues')}>See all</button>}</div>
            {myLeagues.length > 0 ? <div className="competition-list">{myLeagues.map((league) => <CompetitionButton key={league.id} league={league} onOpen={() => openCompetition(league)} />)}</div> : <div className="club-empty-state"><strong>No current competition placement</strong><span>You are currently unassigned. A club administrator will place you before fixtures are generated.</span></div>}
          </section>

          <section className="club-home-section club-home-attention club-needs-you" aria-labelledby="needs-you-title">
            <div className="club-section-heading"><div><p className="club-section-kicker">Attention</p><h2 id="needs-you-title">Needs you</h2></div></div>
            {pendingReviewCount > 0 && pendingReviewLeagueId && <button type="button" className="attention-row" onClick={openPendingReview}><span className="attention-icon"><AppIcon name="results" /></span><span><strong>{pendingReviewCount} result{pendingReviewCount === 1 ? '' : 's'} awaiting your review</strong><small>Confirm or dispute an opponent's score before the table settles.</small></span><span aria-hidden="true">›</span></button>}
            {eligibleRecordLeagues.length > 0 && <button type="button" className="attention-row" onClick={() => selectDestination('record')}><span className="attention-icon"><AppIcon name="record" /></span><span><strong>Have a result to settle?</strong><small>Record it here after your match.</small></span><span aria-hidden="true">›</span></button>}
            {pendingReviewCount === 0 && eligibleRecordLeagues.length === 0 && <div className="club-empty-state club-empty-quiet"><span>Nothing needs your attention right now.</span></div>}
          </section>
        </section>}

        {destination === 'record' && <section className="club-record" aria-labelledby="club-record-title">
          <header className="club-page-heading"><p className="club-page-kicker">Settle a match</p><h1 id="club-record-title">Record</h1></header>
          {eligibleRecordLeagues.length === 0 && <div className="club-empty-state"><strong>No result to record here yet</strong><span>You need to be assigned to an open competition before you can submit a result.</span></div>}
          {eligibleRecordLeagues.length > 1 && !recordLeague && <section className="record-competition-picker" aria-labelledby="record-competition-title"><h2 id="record-competition-title">What are you recording?</h2><div className="competition-list">{eligibleRecordLeagues.map((league) => <CompetitionButton key={league.id} league={league} onOpen={() => setRecordLeagueId(league.id)} />)}</div></section>}
          {recordLeague && <div className="record-competition-workspace competition-record">{eligibleRecordLeagues.length > 1 && <button type="button" className="text-button competition-back" onClick={() => setRecordLeagueId(null)}>Choose another competition</button>}<PlayerLeague user={user} league={recordLeague} isParticipant onUserSaved={onUserSaved} onSignOut={onSignOut} embedded embeddedView="record" /></div>}
        </section>}

        {destination === 'leagues' && <section className="club-leagues" aria-label="Leagues">
          {!focusedLeague && <><header className="club-page-heading"><p className="club-page-kicker">Club competitions</p><h1 id="club-leagues-title">Leagues</h1></header>{clubLeagues.length > 0 ? <div className="competition-list competition-browser">{clubLeagues.map((league) => <CompetitionButton key={league.id} league={league} onOpen={() => openCompetition(league)} />)}</div> : <div className="club-empty-state"><strong>No competitions published yet</strong><span>When the club opens a league, it will appear here.</span></div>}</>}
          {focusedLeague && <div className="competition-workspace"><button type="button" className="text-button competition-back" onClick={() => setFocusedLeagueId(null)}>Back to leagues</button><nav className="competition-tabs" aria-label={`${focusedLeague.name} views`} role="tablist">{(['table', 'fixtures', 'results'] as const).map((view) => <button key={view} id={`competition-tab-${view}`} type="button" role="tab" aria-selected={leagueView === view} aria-controls="competition-panel" className={leagueView === view ? 'competition-tab competition-tab-active' : 'competition-tab'} onClick={() => setLeagueView(view)}>{view === 'table' ? 'Table' : view === 'fixtures' ? 'Fixtures' : 'Results'}</button>)}</nav><div role="tabpanel" id="competition-panel" aria-labelledby={`competition-tab-${leagueView}`} tabIndex={0}><PlayerLeague user={user} league={focusedLeague} isParticipant={myLeagues.some((league) => league.id === focusedLeague.id)} onUserSaved={onUserSaved} onSignOut={onSignOut} embedded embeddedView={leagueView} /></div></div>}
        </section>}

        {destination === 'more' && <section className="club-more" aria-labelledby="club-more-title">
          <header className="club-page-heading"><p className="club-page-kicker">Club account</p><h1 id="club-more-title">More</h1></header>
          {moreView === 'menu' && <nav className="player-more-actions more-menu club-more-menu" aria-label="More player options"><button type="button" className="player-more-action" onClick={() => void openPlayers()}><AppIcon name="players" /><span>Players</span></button><button type="button" className="player-more-action" onClick={() => void openHistory()}><AppIcon name="calendar" /><span>Past seasons</span></button><button type="button" className="player-more-action" onClick={() => setMoreView('profile')}><AppIcon name="profile" /><span>Profile</span></button>{user.role === 'ADMIN' && onOpenAdmin && <button type="button" className="player-more-action" onClick={onOpenAdmin}><AppIcon name="settings" /><span>Admin</span></button>}<button type="button" className="player-more-action" onClick={onSignOut}><AppIcon name="logout" /><span>Sign out</span></button></nav>}
          {moreView === 'players' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><h2>Players</h2>{playersLoading && <p className="loading-message">Loading players...</p>}{playersError && <LoadFailure message={playersError} retryLabel="Try loading players again" onRetry={() => void openPlayers()} />}{!playersLoading && !playersError && players.length === 0 && <div className="club-empty-state club-empty-quiet"><span>No competition players are published yet.</span></div>}{players.length > 0 && <ul className="club-player-list">{players.map((player) => <li key={player.id}><div className="avatar">{player.profileImageUrl ? <img src={player.profileImageUrl} alt="" /> : (player.username ?? '?').slice(0, 1).toUpperCase()}</div><strong>{player.username ?? 'Name pending'}</strong>{player.id === user.id && <span className="you-label">You</span>}</li>)}</ul>}</div>}
          {moreView === 'history' && <div className="player-more-panel history-panel"><button type="button" className="text-button more-back-button" onClick={() => { setHistoryLeague(null); setMoreView('menu'); }}>Back to More</button>{historyLeague ? <><button type="button" className="text-button more-back-button" onClick={() => setHistoryLeague(null)}>Back to seasons</button><header className="history-heading"><p className="club-section-kicker">Historical season</p><h2>{historyLeague.name}</h2><span>{historyLeague.seasonName}</span></header><nav className="competition-tabs" aria-label={`${historyLeague.name} historical views`} role="tablist">{(['table', 'fixtures', 'results'] as const).map((view) => <button key={view} id={`history-competition-tab-${view}`} type="button" role="tab" aria-selected={historyLeagueView === view} aria-controls="history-competition-panel" className={historyLeagueView === view ? 'competition-tab competition-tab-active' : 'competition-tab'} onClick={() => setHistoryLeagueView(view)}>{view === 'table' ? 'Table' : view === 'fixtures' ? 'Fixtures' : 'Results'}</button>)}</nav><div role="tabpanel" id="history-competition-panel" aria-labelledby={`history-competition-tab-${historyLeagueView}`} tabIndex={0}><PlayerLeague user={user} league={historyLeague} isParticipant={history.some((entry) => entry.leagues.some((league) => league.id === historyLeague.id && entry.placedLeagueIds.includes(league.id)))} onUserSaved={onUserSaved} onSignOut={onSignOut} embedded embeddedView={historyLeagueView} /></div></> : <><h2>Past seasons</h2><p className="form-help">Your previous tables, fixtures and results stay linked to the season they belong to.</p>{historyLoading && <p className="loading-message">Loading season history...</p>}{historyError && <LoadFailure message={historyError} retryLabel="Try loading season history again" onRetry={() => void openHistory()} />}{!historyLoading && !historyError && history.length === 0 && <div className="club-empty-state club-empty-quiet"><span>No season history is available yet.</span></div>}{!historyLoading && !historyError && <div className="history-season-list">{history.map((entry) => { const movement = historyMovements.find((item) => item.fromSeasonId === entry.season.id); const placedLeague = entry.leagues.find((league) => entry.placedLeagueIds.includes(league.id)); return <section className="history-season-card" key={entry.season.id}><div className="section-heading"><div><strong>{entry.season.name}</strong><small>{entry.season.isCurrent ? 'Current season' : entry.season.status === 'CLOSED' ? 'Completed season' : entry.season.status}</small></div>{placedLeague && <span className="status-label">{placedLeague.name}</span>}</div>{entry.season.isCurrent && !placedLeague && <p className="form-help">Placement pending for this season. No league has been assumed.</p>}{movement && <p className="form-help">{movement.status === 'APPLIED' ? 'Confirmed movement' : 'Movement under review'}: {movement.toLeagueName ?? movement.toLeagueId ?? 'destination pending'}{movement.toSeasonName ? ` · ${movement.toSeasonName} season` : ''}.</p>}<div className="history-league-list">{entry.leagues.map((league) => <button type="button" className="picker-item" key={league.id} onClick={() => { setHistoryLeague(league); setHistoryLeagueView('table'); }}>{league.name}<span>{league.status} · {league.seasonName}</span></button>)}</div></section>; })}</div>}</>}</div>}
          {moreView === 'profile' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><ProfilePanel user={user} onSaved={saveUser} /></div>}
        </section>}
      </div>
      <MemberNavigation active={destination} onSelect={selectDestination} />
    </section>
  );
}
