import { FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { AdminCompetitionDesk } from './components/AdminCompetitionDesk';
import { AppIcon } from './components/AppIcons';
import { LeagueTabs } from './components/LeagueTabs';
import { PlayerLeague } from './components/PlayerLeague';
import { ProfilePanel } from './components/ProfilePanel';
import { StandingsTable } from './components/StandingsTable';
import { ApiClient, ApiClientError, type AuthPayload, type LeagueDetail, type LeagueSummary, type StandingRow, type ResultSummary, type UserSummary } from './api';
import { GoogleAuth } from './auth/GoogleAuth';
import { shareLeague, publicLeagueKey } from './share';
import { leagueScoringSummary, resultOutcomeLabel, TABLE_TIE_BREAK_DESCRIPTION } from './scoring';

type ViewState = 'loading' | 'signed-out' | 'entering' | 'onboarding' | 'signed-in';
const api = new ApiClient();

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function scrollToSurface(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ClubNavigation() {
  return (
    <nav className="club-bottom-nav" aria-label="Club navigation">
      <button className="club-nav-item club-nav-item-active" type="button" aria-current="page" onClick={() => scrollToSurface('league-overview')}>
        <AppIcon name="league" />
        <span>League</span>
      </button>
      <button className="club-nav-item" type="button" onClick={() => scrollToSurface('latest-results')}>
        <AppIcon name="results" />
        <span>Results</span>
      </button>
      <button className="club-nav-item" type="button" onClick={() => scrollToSurface('sign-in-action')}>
        <AppIcon name="lock" />
        <span>Sign in</span>
      </button>
      <button className="club-nav-item" type="button" onClick={() => scrollToSurface('club-header')}>
        <AppIcon name="more" />
        <span>More</span>
      </button>
    </nav>
  );
}

function PublicLeagueView({ league, signInSlot }: { league: LeagueSummary; signInSlot: ReactNode }) {
  const [detail, setDetail] = useState<LeagueDetail | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([api.publicLeague(league.id), api.standings(league.id), api.results(league.id)]).then(([detailPayload, standingPayload, resultPayload]) => {
      if (!active) return;
      setDetail(detailPayload.league);
      setStandings(standingPayload.standings);
      setResults(resultPayload.results);
    }).catch((cause: unknown) => { if (active) setError(messageFor(cause, 'League data could not be loaded.')); });
    return () => {
      active = false;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [league.id, reloadKey]);

  const share = async () => {
    setShareMessage('');
    try {
      const mode = await shareLeague(navigator, league.name, league.slug, window.location.origin);
      if (mode === 'copied') {
        if (copyTimer.current) clearTimeout(copyTimer.current);
        setCopied(true);
        copyTimer.current = setTimeout(() => setCopied(false), 2000);
      }
      setShareMessage(mode === 'shared' ? 'Share sheet opened.' : 'League link copied.');
    } catch (cause) {
      setShareMessage(messageFor(cause, 'League link could not be shared.'));
    }
  };

  const playerCount = detail?.players.length;

  return (
    <section className="league-experience public-league" aria-labelledby="public-league-title">
      <section className="league-hero-card" id="league-overview">
        <div className="league-hero-copy">
          <div className="league-title-line">
            <h1 id="public-league-title">{league.name}</h1>
            <span className={`status-label status-${league.status.toLowerCase()}`}>{league.status}</span>
          </div>
          <p className="league-season">{league.seasonName} Season</p>
        </div>
        <button className="icon-action league-share" type="button" aria-label="Share league" onClick={() => void share()}>
          <AppIcon name="share" />
        </button>
        <div className="league-target-mark" aria-hidden="true"><AppIcon name="target" /></div>
        <div className="league-hero-meta">
          {playerCount !== undefined && <span><AppIcon name="users" />{playerCount} {playerCount === 1 ? 'Player' : 'Players'}</span>}
          <span><AppIcon name="calendar" />{league.status === 'OPEN' ? 'Season in progress' : 'Season closed'}</span>
          <span><AppIcon name="target" />501 format</span>
        </div>
      </section>

      {shareMessage && <p className="success-message compact-message" role="status">{copied ? 'League link copied.' : shareMessage}</p>}

      <section className="rules-card" aria-label="League rules">
        <span className="surface-icon"><AppIcon name="rules" /></span>
        <div>
          <p className="season-rules">{leagueScoringSummary(league)}</p>
          <p className="rules-tiebreak">{TABLE_TIE_BREAK_DESCRIPTION}</p>
        </div>
      </section>

      <section className="standings-card" aria-labelledby="standings-title">
        <div className="experience-section-heading">
          <div className="section-title-with-icon"><span className="surface-icon surface-icon-small"><AppIcon name="results" /></span><h2 id="standings-title">Standings</h2></div>
        </div>
        <StandingsTable standings={standings} label={`${league.name} ${league.seasonName} standings`} />
        {standings.length === 0 && !error && <div className="experience-empty"><AppIcon name="target" /><strong>No table movement yet</strong><span>Confirmed results will settle the table here.</span></div>}
      </section>

      <section className="signin-action-card" id="sign-in-action" role="group" aria-label="Sign in with Google">
        <span className="surface-icon"><AppIcon name="lock" /></span>
        <div className="signin-action-copy">
          <strong>Sign in to record or confirm results</strong>
          <span>Keep the league accurate and up to date.</span>
        </div>
        {signInSlot}
      </section>

      <section className="results-card" id="latest-results" aria-labelledby="latest-results-title">
        <div className="experience-section-heading">
          <div className="section-title-with-icon"><span className="surface-icon surface-icon-small"><AppIcon name="target" /></span><h2 id="latest-results-title">Latest results</h2></div>
        </div>
        {error ? (
          <div className="experience-empty experience-error" role="alert">
            <strong>{error}</strong>
            <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)}>Retry</button>
          </div>
        ) : results.length > 0 ? (
          <ul className="result-list experience-result-list">
            {results.slice(0, 5).map((result) => (
              <li className="result-row" key={result.id}>
                <div className="result-main"><strong>{result.playerAUsername} <span>{result.playerALegs}</span></strong><span className="result-divider">-</span><strong>{result.playerBUsername} <span>{result.playerBLegs}</span></strong></div>
                <div className="result-meta"><span>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</span></div>
                <span className="result-winner">{resultOutcomeLabel(result.playerALegs, result.playerBLegs, result.playerAUsername, result.playerBUsername)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="experience-empty"><AppIcon name="target" /><strong>No results yet</strong><span>Be the first to throw.</span></div>
        )}
      </section>

      <ClubNavigation />
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
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [publicLoadError, setPublicLoadError] = useState('');
  const [myLeagues, setMyLeagues] = useState<LeagueSummary[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [adminSelectedLeagueId, setAdminSelectedLeagueId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<'admin' | 'player'>('player');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const loadPublicLeagues = async () => {
    setPublicLoadError('');
    try {
      const result = await api.leagues();
      setPublicLeagues(result.leagues);
      const requestedKey = typeof window !== 'undefined' ? publicLeagueKey(window.location.pathname) : null;
      const requested = requestedKey ? result.leagues.find((league) => league.id === requestedKey || league.slug === requestedKey) : null;
      setPublicLeagueId((current) => requested?.id || (current && result.leagues.some((league) => league.id === current) ? current : result.leagues[0]?.id || null));
    } catch {
      setPublicLeagues([]);
      setPublicLeagueId(null);
      setPublicLoadError('The club table could not be loaded.');
    } finally {
      setPublicLoaded(true);
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
    api.me().then((payload) => {
      if (!payload || !payload.user) throw new ApiClientError(401, 'Unauthenticated');
      return applyAuth(payload);
    }).catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status === 401) {
        setView('signed-out');
        setMessage('The league table and match results are coming online.');
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
  }, [view, publicLoaded, publicLeagueId]);

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
    setMessage('The league table and match results are coming online.');
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
  const googleSlot = <div className="google-button-slot" ref={googleButtonRef} aria-busy={signingIn} />;

  return (
    <main className="shell experience-shell" data-state={view}>
      <section className={`shell-panel experience-panel ${view === 'signed-in' ? 'shell-panel-wide' : ''}`}>
        <header className="brand-header experience-header" id="club-header">
          <img className="brand-mark" src="/brand/misfits-501.jpg" alt="Misfits 501 club seal" />
          <div className="brand-meta"><p className="brand-name">Misfits Darts Club</p><span className="online-label">Throw together. Stand together.</span></div>
          {user && <div className="header-user"><div className="avatar">{user.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : (user.username ?? '?').slice(0, 1).toUpperCase()}</div><button className="header-signout" type="button" onClick={() => void logout()}>Sign out</button></div>}
        </header>

        {view === 'signed-out' && <>
          {publicLoadError && <section className="public-fallback"><div className="public-load-state"><p className="error-message" role="alert">{publicLoadError}</p><button className="secondary-button" type="button" onClick={() => void loadPublicLeagues()}>Retry</button></div><section className="signin-action-card" role="group" aria-label="Sign in with Google"><span className="surface-icon"><AppIcon name="lock" /></span><div className="signin-action-copy"><strong>Sign in to your club</strong><span>Record and confirm results when the table returns.</span></div>{googleSlot}</section></section>}
          {!publicLoadError && publicLoaded && publicLeagues.length === 0 && <section className="public-fallback"><div className="experience-empty"><AppIcon name="target" /><strong>No public leagues are published yet</strong><span>Sign in if you are a club member.</span></div><section className="signin-action-card" role="group" aria-label="Sign in with Google"><span className="surface-icon"><AppIcon name="lock" /></span><div className="signin-action-copy"><strong>Sign in to Misfits 501</strong><span>Use your Google account to enter the club.</span></div>{googleSlot}</section></section>}
          {!publicLoadError && publicLeagues.length > 0 && <section className="public-home">{publicLeagues.length > 1 && <LeagueTabs ariaLabel="Club seasons" leagues={publicLeagues} selectedId={publicLeagueId} onSelect={setPublicLeagueId} />}{selectedPublicLeague && <PublicLeagueView league={selectedPublicLeague} signInSlot={googleSlot} />}</section>}
        </>}

        {view === 'onboarding' && (
          <form className="onboarding-form" onSubmit={submitUsername}>
            <div className="form-heading">
              <h2>Set your player nickname</h2>
              <p className="form-help">This is how your name will appear on the club table and match results.</p>
            </div>
            <label htmlFor="username">Nickname</label>
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. Bullseye Billy" autoComplete="nickname" maxLength={24} required />
            <button className="primary-button" type="submit">Continue</button>
          </form>
        )}

        {view === 'signed-in' && user && (
          <div className="account-panel signed-in-experience">
            {user.role === 'ADMIN' && (
              <nav className="segmented-tabs" aria-label="Admin views">
                <button className={adminMode === 'admin' ? 'segmented-tab segmented-tab-active' : 'segmented-tab'} type="button" onClick={() => setAdminMode('admin')}>Season admin</button>
                <button className={adminMode === 'player' ? 'segmented-tab segmented-tab-active' : 'segmented-tab'} type="button" onClick={() => setAdminMode('player')}>Club table</button>
              </nav>
            )}
            {message && <p className="success-message compact-message" role="status">{message}</p>}
            {user.role === 'ADMIN' && adminMode === 'admin' && (
              <div className="admin-workbench"><AdminCompetitionDesk user={user} selectedLeagueId={adminSelectedLeagueId} onLeagueCreated={handleLeagueCreated} onLeagueChanged={handleLeagueChanged} onLeagueSelected={(league) => { setAdminSelectedLeagueId(league?.id ?? null); }} /></div>
            )}
            {(user.role !== 'ADMIN' || adminMode === 'player') && (
              <div className="member-workbench member-area">
                {myLeagues.length > 0 ? (
                  <>
                    {myLeagues.length > 1 && <LeagueTabs leagues={myLeagues} selectedId={selectedLeagueId} onSelect={setSelectedLeagueId} ariaLabel="Member seasons" />}
                    {selectedLeague && <PlayerLeague user={user} league={selectedLeague} onUserSaved={saveUser} />}
                  </>
                ) : (
                  <>
                    <div className="empty-member"><h2>Open your Misfits invite.</h2><p>Use the shared club link, sign in with Google, then join a season when registrations open.</p></div>
                    <ProfilePanel user={user} onSaved={saveProfile} />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {view !== 'signed-in' && view !== 'signed-out' && <small className="shell-stamp">{view === 'loading' ? 'Loading' : 'Secure Google access'}</small>}
      </section>
    </main>
  );
}
