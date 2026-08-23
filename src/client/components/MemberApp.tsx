import { useEffect, useMemo, useState } from 'react';
import { ApiClient, type LeaguePlayer, type LeagueSummary, type UserSummary } from '../api';
import { AppIcon } from './AppIcons';
import { MemberNavigation, type MemberDestination } from './MemberNavigation';
import { PlayerLeague, type EmbeddedLeagueView } from './PlayerLeague';
import { ProfilePanel } from './ProfilePanel';

const api = new ApiClient();
type MoreView = 'menu' | 'players' | 'profile';

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

export function MemberApp({ user, clubLeagues, myLeagues, onUserSaved, onOpenAdmin, onSignOut }: {
  user: UserSummary;
  clubLeagues: LeagueSummary[];
  myLeagues: LeagueSummary[];
  onUserSaved: (user: UserSummary) => void;
  onOpenAdmin?: () => void;
  onSignOut: () => void;
}) {
  const [destination, setDestination] = useState<MemberDestination>('home');
  const [focusedLeagueId, setFocusedLeagueId] = useState<string | null>(null);
  const [leagueView, setLeagueView] = useState<EmbeddedLeagueView>('table');
  const [recordLeagueId, setRecordLeagueId] = useState<string | null>(null);
  const [moreView, setMoreView] = useState<MoreView>('menu');
  const [players, setPlayers] = useState<LeaguePlayer[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');

  const eligibleRecordLeagues = useMemo(() => myLeagues.filter((league) => league.status === 'OPEN'), [myLeagues]);
  const focusedLeague = clubLeagues.find((league) => league.id === focusedLeagueId) ?? null;
  const recordLeague = eligibleRecordLeagues.find((league) => league.id === recordLeagueId)
    ?? (eligibleRecordLeagues.length === 1 ? eligibleRecordLeagues[0] : null);

  useEffect(() => {
    if (eligibleRecordLeagues.length === 1) setRecordLeagueId(eligibleRecordLeagues[0].id);
    else if (recordLeagueId && !eligibleRecordLeagues.some((league) => league.id === recordLeagueId)) setRecordLeagueId(null);
  }, [eligibleRecordLeagues, recordLeagueId]);

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

  const saveUser = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => onUserSaved({ ...user, ...profile });

  return (
    <section className="club-member-app">
      <div className="club-member-content">
        {destination === 'home' && <section className="club-home" aria-labelledby="club-home-title">
          <header className="club-page-heading"><p className="club-page-kicker">Misfits</p><h1 id="club-home-title">Good to see you, {user.username}.</h1></header>

          <section className="club-home-section" aria-labelledby="your-competitions-title">
            <div className="club-section-heading"><div><p className="club-section-kicker">Playing now</p><h2 id="your-competitions-title">Your competitions</h2></div>{clubLeagues.length > 0 && <button type="button" className="text-button" onClick={() => selectDestination('leagues')}>See all</button>}</div>
            {myLeagues.length > 0 ? <div className="competition-list">{myLeagues.map((league) => <CompetitionButton key={league.id} league={league} onOpen={() => openCompetition(league)} />)}</div> : <div className="club-empty-state"><strong>No competitions assigned yet</strong><span>You are in the club. When an admin places you in a competition, it will appear here.</span></div>}
          </section>

          <section className="club-home-section club-needs-you" aria-labelledby="needs-you-title">
            <div className="club-section-heading"><div><p className="club-section-kicker">Attention</p><h2 id="needs-you-title">Needs you</h2></div></div>
            {eligibleRecordLeagues.length > 0 ? <button type="button" className="attention-row" onClick={() => selectDestination('record')}><span className="attention-icon"><AppIcon name="record" /></span><span><strong>Have a result to settle?</strong><small>Record it here after your match.</small></span><span aria-hidden="true">›</span></button> : <div className="club-empty-state club-empty-quiet"><span>Nothing needs your attention right now.</span></div>}
          </section>
        </section>}

        {destination === 'record' && <section className="club-record" aria-labelledby="club-record-title">
          <header className="club-page-heading"><p className="club-page-kicker">Settle a match</p><h1 id="club-record-title">Record</h1></header>
          {eligibleRecordLeagues.length === 0 && <div className="club-empty-state"><strong>No result to record here yet</strong><span>You need to be assigned to an open competition before you can submit a result.</span></div>}
          {eligibleRecordLeagues.length > 1 && !recordLeague && <section className="record-competition-picker" aria-labelledby="record-competition-title"><h2 id="record-competition-title">What are you recording?</h2><div className="competition-list">{eligibleRecordLeagues.map((league) => <CompetitionButton key={league.id} league={league} onOpen={() => setRecordLeagueId(league.id)} />)}</div></section>}
          {recordLeague && <div className="record-competition-workspace">{eligibleRecordLeagues.length > 1 && <button type="button" className="text-button competition-back" onClick={() => setRecordLeagueId(null)}>Choose another competition</button>}<PlayerLeague user={user} league={recordLeague} isParticipant onUserSaved={onUserSaved} onSignOut={onSignOut} embedded embeddedView="record" /></div>}
        </section>}

        {destination === 'leagues' && <section className="club-leagues" aria-labelledby="club-leagues-title">
          {!focusedLeague && <><header className="club-page-heading"><p className="club-page-kicker">Club competitions</p><h1 id="club-leagues-title">Leagues</h1></header>{clubLeagues.length > 0 ? <div className="competition-list competition-browser">{clubLeagues.map((league) => <CompetitionButton key={league.id} league={league} onOpen={() => openCompetition(league)} />)}</div> : <div className="club-empty-state"><strong>No competitions published yet</strong><span>When the club opens a league, it will appear here.</span></div>}</>}
          {focusedLeague && <div className="competition-workspace"><button type="button" className="text-button competition-back" onClick={() => setFocusedLeagueId(null)}>Back to leagues</button><nav className="competition-tabs" aria-label={`${focusedLeague.name} views`} role="tablist">{(['table', 'fixtures', 'results'] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={leagueView === view} className={leagueView === view ? 'competition-tab competition-tab-active' : 'competition-tab'} onClick={() => setLeagueView(view)}>{view === 'table' ? 'Table' : view === 'fixtures' ? 'Fixtures' : 'Results'}</button>)}</nav><PlayerLeague user={user} league={focusedLeague} isParticipant={myLeagues.some((league) => league.id === focusedLeague.id)} onUserSaved={onUserSaved} onSignOut={onSignOut} embedded embeddedView={leagueView} /></div>}
        </section>}

        {destination === 'more' && <section className="club-more" aria-labelledby="club-more-title">
          <header className="club-page-heading"><p className="club-page-kicker">Club account</p><h1 id="club-more-title">More</h1></header>
          {moreView === 'menu' && <nav className="player-more-actions more-menu club-more-menu" aria-label="More player options"><button type="button" className="player-more-action" onClick={() => void openPlayers()}><AppIcon name="players" /><span>Players</span></button><button type="button" className="player-more-action" onClick={() => setMoreView('profile')}><AppIcon name="profile" /><span>Profile</span></button>{user.role === 'ADMIN' && onOpenAdmin && <button type="button" className="player-more-action" onClick={onOpenAdmin}><AppIcon name="settings" /><span>Admin</span></button>}<button type="button" className="player-more-action" onClick={onSignOut}><AppIcon name="logout" /><span>Sign out</span></button></nav>}
          {moreView === 'players' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><h2>Players</h2>{playersLoading && <p className="loading-message">Loading players...</p>}{playersError && <p className="error-message" role="alert">{playersError}</p>}{!playersLoading && !playersError && players.length === 0 && <div className="club-empty-state club-empty-quiet"><span>No competition players are published yet.</span></div>}{players.length > 0 && <ul className="club-player-list">{players.map((player) => <li key={player.id}><div className="avatar">{player.profileImageUrl ? <img src={player.profileImageUrl} alt="" /> : (player.username ?? '?').slice(0, 1).toUpperCase()}</div><strong>{player.username ?? 'Name pending'}</strong>{player.id === user.id && <span className="you-label">You</span>}</li>)}</ul>}</div>}
          {moreView === 'profile' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><ProfilePanel user={user} onSaved={saveUser} /></div>}
        </section>}
      </div>
      <MemberNavigation active={destination} onSelect={selectDestination} />
    </section>
  );
}
