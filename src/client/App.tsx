import { FormEvent, useEffect, useRef, useState } from 'react';
import { AdminLeagueDesk } from './components/AdminLeagueDesk';
import { LeagueTabs } from './components/LeagueTabs';
import { PlayerLeague } from './components/PlayerLeague';
import { ProfilePanel } from './components/ProfilePanel';
import { ApiClient, ApiClientError, type AuthPayload, type LeagueDetail, type LeagueSummary, type StandingRow, type ResultSummary, type UserSummary } from './api';
import { GoogleAuth } from './auth/GoogleAuth';
import { shareLeague, publicLeagueKey } from './share';

type ViewState = 'loading' | 'signed-out' | 'entering' | 'onboarding' | 'signed-in';
const api = new ApiClient();

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function PublicLeagueView({ league }: { league: LeagueSummary }) {
  const [detail, setDetail] = useState<LeagueDetail | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([api.publicLeague(league.id), api.standings(league.id), api.results(league.id)]).then(([detailPayload, standingPayload, resultPayload]) => {
      if (!active) return;
      setDetail(detailPayload.league);
      setStandings(standingPayload.standings);
      setResults(resultPayload.results);
    }).catch((cause: unknown) => { if (active) setError(messageFor(cause, 'League data could not be loaded.')); });
    return () => { active = false; };
  }, [league.id]);

  const share = async () => {
    setShareMessage('');
    try {
      const mode = await shareLeague(navigator, league.name, league.slug, window.location.origin);
      setShareMessage(mode === 'shared' ? 'Share sheet opened.' : 'League link copied.');
    } catch (cause) {
      setShareMessage(messageFor(cause, 'League link could not be shared.'));
    }
  };

  return (
    <section className="public-league" aria-labelledby="public-league-title">
      <div className="section-heading"><div><p className="section-kicker">PUBLIC TABLE / {league.seasonName}</p><h2 id="public-league-title">{league.name}</h2></div><div className="public-league-actions"><span className={`status-label status-${league.status.toLowerCase()}`}>{league.status}</span><button className="action-button" type="button" onClick={() => void share()}>Share league</button></div></div>
      {shareMessage && <p className="success-message" role="status">{shareMessage}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="standings-list">{standings.map((row) => <div className="standing-row" key={row.playerId}><span className="standing-rank">{row.rank}</span><div className="standing-player"><strong>{row.username}</strong><small>{row.played} played / {row.average.toFixed(2)} avg</small></div><span className="standing-record">{row.won}-{row.lost}</span><strong className="standing-points">{row.points}</strong></div>)}{standings.length === 0 && <p className="empty-message">No confirmed games yet.</p>}</div>
      {detail && <p className="public-meta">{detail.players.length} active {detail.players.length === 1 ? 'player' : 'players'} / first to {detail.targetLegs} legs</p>}
      {results.length > 0 && <div className="public-results"><h3>Latest results</h3><ul className="result-list">{results.slice(0, 5).map((result) => <li className="result-row" key={result.id}><div className="result-main"><strong>{result.playerAUsername} <span>{result.playerALegs}</span></strong><span className="result-divider">-</span><strong>{result.playerBUsername} <span>{result.playerBLegs}</span></strong></div><div className="result-meta"><span>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</span></div></li>)}</ul></div>}
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [message, setMessage] = useState('Checking your Misfits 501 membership...');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [username, setUsername] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [publicLeagues, setPublicLeagues] = useState<LeagueSummary[]>([]);
  const [publicLeagueId, setPublicLeagueId] = useState<string | null>(null);
  const [myLeagues, setMyLeagues] = useState<LeagueSummary[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [adminSelectedLeagueId, setAdminSelectedLeagueId] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const loadPublicLeagues = async () => {
    try {
      const result = await api.leagues();
      setPublicLeagues(result.leagues);
      const requestedKey = typeof window !== 'undefined' ? publicLeagueKey(window.location.pathname) : null;
      const requested = requestedKey ? result.leagues.find((league) => league.id === requestedKey || league.slug === requestedKey) : null;
      setPublicLeagueId((current) => requested?.id || current || result.leagues[0]?.id || null);
    } catch {
      setPublicLeagues([]);
    }
  };

  const loadMyLeagues = async (preferredLeagueId?: string | null) => {
    try {
      const result = await api.myLeagues();
      setMyLeagues(result.leagues);
      setSelectedLeagueId((current) => {
        if (preferredLeagueId && result.leagues.some((league) => league.id === preferredLeagueId)) return preferredLeagueId;
        return current && result.leagues.some((league) => league.id === current) ? current : result.leagues[0]?.id || null;
      });
    } catch {
      setMyLeagues([]);
    }
  };

  const joinPendingInvite = async (): Promise<string | null> => {
    const token = typeof window !== 'undefined' ? (window.sessionStorage.getItem('league_pending_invite') ?? window.sessionStorage.getItem('misfits_pending_invite')) : null;
    if (!token) return null;
    try {
      const result = await api.joinInvite(token);
      window.sessionStorage.removeItem('league_pending_invite');
      window.sessionStorage.removeItem('misfits_pending_invite');
      setMessage('You joined the league.');
      return result.membership.leagueId;
    } catch (cause) {
      setMessage(messageFor(cause, 'That invite could not be used.'));
      return null;
    }
  };

  const applyAuth = async (payload: AuthPayload) => {
    setSigningIn(false);
    setUser(payload.user);
    if (payload.requiresOnboarding) {
      setView('onboarding');
      setMessage('Choose the name your club will see.');
      return;
    }
    setView('signed-in');
    setMessage('Your Misfits 501 club workspace is ready.');
    const joinedLeagueId = await joinPendingInvite();
    await loadMyLeagues(joinedLeagueId);
  };

  useEffect(() => {
    void loadPublicLeagues();
    api.me().then((payload) => void applyAuth(payload)).catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status === 401) {
        setView('signed-out');
        setMessage('Sign in to enter the club and record games.');
      } else {
        setView('signed-out');
        setMessage('The league could not be reached. Try signing in again.');
      }
    });
  }, []);

  useEffect(() => {
    if (view !== 'signed-out' || !googleButtonRef.current) return;
    const container = googleButtonRef.current;
    let active = true;
    let dispose: (() => void) | undefined;
    new GoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').mountButton(container, (credential) => {
      if (!active) return;
      setSigningIn(true);
      setMessage('Signing you in...');
      api.signIn(credential).then((payload) => { if (active) void applyAuth(payload); }).catch((error: unknown) => {
        if (!active) return;
        setSigningIn(false);
        setMessage(messageFor(error, 'Google sign-in could not be completed.'));
      });
    }, () => { if (active) { setSigningIn(true); setMessage('Opening Google sign-in...'); } }).then((cleanup) => {
      if (active) dispose = cleanup;
      else cleanup();
    }).catch((error: unknown) => { if (active) { setSigningIn(false); setMessage(messageFor(error, 'Google sign-in could not be loaded.')); } });
    return () => { active = false; dispose?.(); };
  }, [view]);

  useEffect(() => {
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/join\/([^/]+)/) : null;
    if (match) window.sessionStorage.setItem('league_pending_invite', match[1]);
  }, []);

  useEffect(() => {
    if (myLeagues.length > 0 && selectedLeagueId && !myLeagues.some((league) => league.id === selectedLeagueId)) {
      setSelectedLeagueId(myLeagues[0].id);
    }
  }, [myLeagues, selectedLeagueId]);

  const submitUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setView('entering');
      setMessage('Saving your nickname...');
      await applyAuth(await api.setUsername(username));
    } catch (error) {
      setView('onboarding');
      setMessage(messageFor(error, 'That nickname could not be saved.'));
    }
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setSigningIn(false);
    setUser(null);
    setMyLeagues([]);
    setSelectedLeagueId(null);
    setAdminSelectedLeagueId(null);
    setView('signed-out');
    setMessage('You are signed out.');
  };

  const saveUser = (saved: UserSummary) => setUser(saved);
  const saveProfile = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => setUser((current) => current ? { ...current, ...profile } : current);
  const handleLeagueCreated = (league: LeagueSummary) => {
    setMyLeagues((current) => current.some((item) => item.id === league.id) ? current.map((item) => item.id === league.id ? league : item) : [league, ...current]);
    setSelectedLeagueId(league.id);
    setAdminSelectedLeagueId(league.id);
  };
  const handleLeagueChanged = (league: LeagueSummary) => {
    setMyLeagues((current) => current.some((item) => item.id === league.id) ? current.map((item) => item.id === league.id ? league : item) : current);
  };
  const selectedLeague = myLeagues.find((league) => league.id === selectedLeagueId) ?? null;
  const selectedPublicLeague = publicLeagues.find((league) => league.id === publicLeagueId) ?? null;

  return (
    <main className="shell" data-state={view}>
      <section className={`shell-panel ${view === 'signed-in' ? 'shell-panel-wide' : ''}`}>
        <header className="brand-header">
          <img className="brand-mark" src="/brand/misfits-501.jpg" alt="Misfits 501" />
          <div className="brand-meta"><p className="eyebrow">THE MISFITS 501 CLUB</p><span className="online-label">We just can't hit 180</span></div>
          {user && <div className="header-user"><div className="avatar">{user.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : (user.username ?? '?').slice(0, 1).toUpperCase()}</div><button className="header-signout" type="button" onClick={() => void logout()}>Sign out</button></div>}
        </header>
        <div className="page-intro"><p className="hero-kicker">ONE CLUB / WEEKLY DARTS / NO FUSS</p><h1>Club darts,<br /><em>beautifully settled.</em></h1><p className="intro">{message}</p><div className="club-links" aria-label="Club links"><a href="https://www.dartcounter.net/" target="_blank" rel="noreferrer">DartCounter</a><span>One club, well kept.</span></div></div>

        {view === 'signed-out' && <>
          {publicLeagues.length > 0 && <section className="public-home" aria-labelledby="public-leagues-title"><div className="section-heading"><div><p className="section-kicker">THE CLUB TABLE</p><h2 id="public-leagues-title">Misfits 501 leagues</h2></div><span className="count-label">{publicLeagues.length}</span></div><LeagueTabs leagues={publicLeagues} selectedId={publicLeagueId} onSelect={setPublicLeagueId} />{selectedPublicLeague && <PublicLeagueView league={selectedPublicLeague} />}</section>}
          <div className="sign-in-panel"><p className="section-kicker">MEMBERS' DOOR</p><h2>Enter the club</h2><p className="sign-in-copy">Use your Google account to join an invited Misfits 501 league and keep your results attached to you.</p><div className="google-button-slot" ref={googleButtonRef} aria-busy={signingIn} /></div>
        </>}

        {view === 'onboarding' && <form className="onboarding-form" onSubmit={submitUsername}><label htmlFor="username">Nickname</label><input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="nickname" maxLength={24} required /><button className="primary-button" type="submit">Continue</button></form>}

        {view === 'signed-in' && user && <div className="account-panel"><div className="account-heading"><div><p className="account-name">{user.username ?? 'Player'}</p><p className="account-role">{user.role === 'ADMIN' ? 'Club administrator' : 'Misfits 501 player'}</p></div><span className="account-status">{myLeagues.length} {myLeagues.length === 1 ? 'league' : 'leagues'}</span></div>{user.role === 'ADMIN' && <AdminLeagueDesk user={user} selectedLeagueId={adminSelectedLeagueId} onLeagueCreated={handleLeagueCreated} onLeagueChanged={handleLeagueChanged} onLeagueSelected={(league) => { setAdminSelectedLeagueId(league?.id ?? null); }} />}<div className="member-area">{myLeagues.length > 0 ? <><LeagueTabs leagues={myLeagues} selectedId={selectedLeagueId} onSelect={setSelectedLeagueId} />{selectedLeague && <PlayerLeague user={user} league={selectedLeague} onUserSaved={saveUser} />}</> : <><div className="empty-member"><p className="section-kicker">JOIN THE CLUB</p><h2>Open your Misfits invite.</h2><p>Use the shared club link, sign in with Google, then join a league when registrations open.</p></div><ProfilePanel user={user} onSaved={saveProfile} /></>}</div></div>}

        {view !== 'signed-in' && <small className="shell-stamp">{view === 'loading' ? 'Loading' : 'Secure Google access'}</small>}
      </section>
    </main>
  );
}
