import { FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { AdminCompetitionDesk } from './components/AdminCompetitionDesk';
import { AppIcon } from './components/AppIcons';
import { LeagueTabs } from './components/LeagueTabs';
import { PlayerLeague } from './components/PlayerLeague';
import { ProfilePanel } from './components/ProfilePanel';
import { ApiClient, ApiClientError, type AuthPayload, type LeagueSummary, type UserSummary } from './api';
import { GoogleAuth } from './auth/GoogleAuth';

type ViewState = 'loading' | 'signed-out' | 'pending' | 'rejected' | 'onboarding' | 'signed-in';
const CLUB_INVITE_KEY = 'misfits_pending_club_invite';
const api = new ApiClient();

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function initialClubInvite(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/join\/([^/]+)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : window.sessionStorage.getItem(CLUB_INVITE_KEY);
  if (token) window.sessionStorage.setItem(CLUB_INVITE_KEY, token);
  return token ?? null;
}

function ClubShell({ children, user, onSignOut, wide = false }: {
  children: ReactNode;
  user?: UserSummary | null;
  onSignOut?: () => void;
  wide?: boolean;
}) {
  return <main className="shell experience-shell private-club-shell">
    <section className={`shell-panel experience-panel ${wide ? 'shell-panel-wide' : ''}`}>
      <header className="brand-header experience-header private-brand-header" id="club-header">
        <img className="brand-mark" src="/brand/misfits-501.jpg" alt="Misfits 501 club seal" />
        <div className="brand-meta"><p className="brand-name">Misfits Darts Club</p><span className="online-label">Throw together. Stand together.</span></div>
        {user && <div className="header-user"><div className="avatar">{user.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : (user.username ?? '?').slice(0, 1).toUpperCase()}</div>{onSignOut && <button className="header-signout" type="button" onClick={onSignOut}>Sign out</button>}</div>}
      </header>
      {children}
    </section>
  </main>;
}

export default function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [message, setMessage] = useState('Checking your club membership…');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [username, setUsername] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [clubInviteToken, setClubInviteToken] = useState<string | null>(() => initialClubInvite());
  const [clubLeagues, setClubLeagues] = useState<LeagueSummary[]>([]);
  const [myLeagues, setMyLeagues] = useState<LeagueSummary[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [adminSelectedLeagueId, setAdminSelectedLeagueId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [clubLoadError, setClubLoadError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const clearClubData = () => {
    setClubLeagues([]);
    setMyLeagues([]);
    setSelectedLeagueId(null);
    setAdminSelectedLeagueId(null);
    setClubLoadError('');
  };

  const loadApprovedClub = async (preferredLeagueId?: string | null) => {
    setClubLoadError('');
    try {
      const [clubPayload, personalPayload] = await Promise.all([api.leagues(), api.myLeagues()]);
      setClubLeagues(clubPayload.leagues);
      setMyLeagues(personalPayload.leagues);
      setSelectedLeagueId((current) => {
        const available = clubPayload.leagues;
        if (preferredLeagueId && available.some((league) => league.id === preferredLeagueId)) return preferredLeagueId;
        if (current && available.some((league) => league.id === current)) return current;
        const personal = personalPayload.leagues.find((league) => available.some((candidate) => candidate.id === league.id));
        return personal?.id ?? available[0]?.id ?? null;
      });
    } catch (cause) {
      clearClubData();
      setClubLoadError(messageFor(cause, 'Your private club workspace could not be loaded.'));
    }
  };

  const mapAuthenticatedUser = async (payload: AuthPayload) => {
    setSigningIn(false);
    setUser(payload.user);
    clearClubData();
    setAdminMode(false);

    if (payload.user.clubStatus === 'PENDING') {
      setView('pending');
      setMessage('Waiting for a club admin to approve you');
      return;
    }
    if (payload.user.clubStatus === 'REJECTED') {
      setView('rejected');
      setMessage('Your membership request was not approved.');
      return;
    }
    if (payload.user.username === null) {
      setView('onboarding');
      setMessage('Choose the name your club will see.');
      return;
    }

    setView('signed-in');
    setMessage('Your Misfits 501 club workspace is ready.');
    await loadApprovedClub();
  };

  useEffect(() => {
    let active = true;
    api.me().then((payload) => {
      if (!active || !payload?.user) return;
      void mapAuthenticatedUser(payload);
    }).catch((error: unknown) => {
      if (!active) return;
      setUser(null);
      clearClubData();
      setView('signed-out');
      if (error instanceof ApiClientError && error.status === 401) setMessage('Private club access');
      else setMessage('Misfits could not be reached. Try signing in again.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (view !== 'signed-out' || !googleButtonRef.current) return;
    const container = googleButtonRef.current;
    let active = true;
    let dispose: (() => void) | undefined;
    new GoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').mountButton(container, (credential) => {
      if (!active) return;
      setSigningIn(true);
      setMessage('Signing you in…');
      const inviteToken = window.sessionStorage.getItem(CLUB_INVITE_KEY) ?? clubInviteToken ?? undefined;
      api.signIn(credential, inviteToken || undefined).then((payload) => {
        if (!active) return;
        if (inviteToken) {
          window.sessionStorage.removeItem(CLUB_INVITE_KEY);
          setClubInviteToken(null);
          window.history.replaceState({}, '', '/');
        }
        void mapAuthenticatedUser(payload);
      }).catch((error: unknown) => {
        if (!active) return;
        setSigningIn(false);
        if (error instanceof ApiClientError && error.code === 'INVITE_REQUIRED') setMessage('A club invitation is required');
        else setMessage(messageFor(error, 'Google sign-in could not be completed.'));
      });
    }, () => {
      if (active) {
        setSigningIn(true);
        setMessage('Opening Google sign-in…');
      }
    }).then((cleanup) => {
      if (active) dispose = cleanup;
      else cleanup();
    }).catch((error: unknown) => {
      if (active) {
        setSigningIn(false);
        setMessage(messageFor(error, 'Google sign-in could not be loaded.'));
      }
    });
    return () => { active = false; dispose?.(); };
  }, [view, clubInviteToken]);

  const submitUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setMessage('Saving your nickname…');
      await mapAuthenticatedUser(await api.setUsername(username));
    } catch (error) {
      setView('onboarding');
      setMessage(messageFor(error, 'That nickname could not be saved.'));
    }
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setSigningIn(false);
    setUser(null);
    clearClubData();
    setAdminMode(false);
    setView('signed-out');
    setMessage('Private club access');
  };

  const saveUser = (saved: UserSummary) => setUser(saved);
  const saveProfile = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => setUser((current) => current ? { ...current, ...profile } : current);
  const handleLeagueCreated = (league: LeagueSummary) => {
    setClubLeagues((current) => current.some((item) => item.id === league.id) ? current.map((item) => item.id === league.id ? league : item) : [league, ...current]);
    setSelectedLeagueId(league.id);
    setAdminSelectedLeagueId(league.id);
  };
  const handleLeagueChanged = (league: LeagueSummary) => {
    setClubLeagues((current) => current.some((item) => item.id === league.id) ? current.map((item) => item.id === league.id ? league : item) : current);
    setMyLeagues((current) => current.map((item) => item.id === league.id ? league : item));
  };
  const selectedLeague = clubLeagues.find((league) => league.id === selectedLeagueId) ?? null;
  const selectedLeagueIsMine = selectedLeague ? myLeagues.some((league) => league.id === selectedLeague.id) : false;
  const googleSlot = <div className="google-button-slot" ref={googleButtonRef} aria-busy={signingIn} />;

  if (view === 'loading') {
    return <ClubShell><section className="private-entry-state private-entry-loading" aria-live="polite"><span className="private-entry-icon"><AppIcon name="lock" /></span><h1>Misfits</h1><p>Private members club</p><div className="private-loading-line" aria-hidden="true" /><small>{message}</small></section></ClubShell>;
  }

  if (view === 'signed-out') {
    return <ClubShell><section className="private-entry-state private-signin-state">
      <span className="private-entry-icon"><AppIcon name="lock" /></span>
      <p className="entry-kicker">Private members club</p>
      <h1>{clubInviteToken ? "You've been invited to join Misfits" : 'Welcome to Misfits'}</h1>
      <p className="entry-copy">{clubInviteToken ? 'Sign in with Google to send your membership request. A club admin will approve access before any league data becomes available.' : 'Existing members can sign in with Google. New members need a private club invitation.'}</p>
      <div className="private-google-card" role="group" aria-label="Sign in with Google">{googleSlot}</div>
      {message && message !== 'Private club access' && <p className={message === 'A club invitation is required' ? 'error-message entry-message' : 'form-help entry-message'} role={message === 'A club invitation is required' ? 'alert' : 'status'}>{message}</p>}
      <p className="privacy-note"><AppIcon name="lock" /> League tables, results and member details stay private until membership is approved.</p>
    </section></ClubShell>;
  }

  if (view === 'pending' && user) {
    return <ClubShell user={user}><section className="private-entry-state membership-state" aria-labelledby="pending-membership-title"><span className="private-entry-icon"><AppIcon name="clock" /></span><p className="entry-kicker">Request received</p><h1 id="pending-membership-title">Membership request sent</h1><p className="entry-copy">Waiting for a club admin to approve you</p><p className="privacy-note"><AppIcon name="lock" /> Your account is signed in, but club data remains locked until approval.</p><button className="secondary-button private-signout-button" type="button" onClick={() => void logout()}>Sign out</button></section></ClubShell>;
  }

  if (view === 'rejected' && user) {
    return <ClubShell user={user}><section className="private-entry-state membership-state" aria-labelledby="rejected-membership-title"><span className="private-entry-icon"><AppIcon name="lock" /></span><p className="entry-kicker">Private club access</p><h1 id="rejected-membership-title">Membership request not approved</h1><p className="entry-copy">Your account does not currently have access to Misfits club data.</p><p className="form-help">If you think this needs reviewing, contact a club administrator directly.</p><button className="secondary-button private-signout-button" type="button" onClick={() => void logout()}>Sign out</button></section></ClubShell>;
  }

  if (view === 'onboarding' && user) {
    return <ClubShell user={user} onSignOut={() => void logout()}><form className="onboarding-form private-onboarding-card" onSubmit={submitUsername}><div className="form-heading"><p className="entry-kicker">Membership approved</p><h1>Set your player nickname</h1><p className="form-help">This is how your name will appear to other approved club members on tables and results.</p></div><label htmlFor="username">Nickname</label><input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. Bullseye Billy" autoComplete="nickname" maxLength={24} required /><button className="primary-button" type="submit">Enter Misfits</button>{message && message !== 'Choose the name your club will see.' && <p className="form-help" role="status">{message}</p>}</form></ClubShell>;
  }

  const signedInNeedsHeaderSignOut = view === 'signed-in' && user && clubLeagues.length === 0;
  return <ClubShell user={user} onSignOut={signedInNeedsHeaderSignOut ? () => void logout() : undefined} wide>
    {view === 'signed-in' && user && <div className="account-panel signed-in-experience private-member-app">
      {message && <p className="success-message compact-message" role="status">{message}</p>}
      {clubLoadError && <div className="experience-empty experience-error" role="alert"><strong>{clubLoadError}</strong><button className="secondary-button" type="button" onClick={() => void loadApprovedClub()}>Retry club workspace</button></div>}
      {user.role === 'ADMIN' && adminMode && <div className="admin-workbench"><div className="admin-workbench-entry"><button className="secondary-button admin-back-button" type="button" onClick={() => setAdminMode(false)}>Back to club</button><p className="form-help">Club administration</p></div><AdminCompetitionDesk user={user} selectedLeagueId={adminSelectedLeagueId} onLeagueCreated={handleLeagueCreated} onLeagueChanged={handleLeagueChanged} onLeagueSelected={(league) => setAdminSelectedLeagueId(league?.id ?? null)} /></div>}
      {(!adminMode || user.role !== 'ADMIN') && !clubLoadError && <div className="member-workbench member-area">
        {clubLeagues.length > 0 ? <>{clubLeagues.length > 1 && <LeagueTabs leagues={clubLeagues} selectedId={selectedLeagueId} onSelect={setSelectedLeagueId} ariaLabel="Club leagues" />}{selectedLeague && <PlayerLeague user={user} league={selectedLeague} isParticipant={selectedLeagueIsMine} onUserSaved={saveUser} onOpenAdmin={user.role === 'ADMIN' ? () => setAdminMode(true) : undefined} onSignOut={() => void logout()} />}</> : <><div className="empty-member private-empty-member"><span className="private-entry-icon"><AppIcon name="target" /></span><h2>You're in the club.</h2><p>No league has been published for members yet. Your profile is ready while the competition is set up.</p></div><ProfilePanel user={user} onSaved={saveProfile} /></>}
      </div>}
    </div>}
  </ClubShell>;
}
