import { FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { AdminCompetitionDesk } from './components/AdminCompetitionDesk';
import { AppIcon } from './components/AppIcons';
import { MemberApp } from './components/MemberApp';
import { ApiClient, ApiClientError, type AuthPayload, type LeagueSummary, type UserSummary } from './api';
import { GoogleAuth } from './auth/GoogleAuth';

type ViewState = 'loading' | 'signed-out' | 'pending' | 'rejected' | 'suspended' | 'onboarding' | 'signed-in';
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

function ClubShell({ children, user, onSignOut, onProfile, wide = false }: {
  children: ReactNode;
  user?: UserSummary | null;
  onSignOut?: () => void;
  onProfile?: () => void;
  wide?: boolean;
}) {
  const avatar = user && (user.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : (user.username ?? '?').slice(0, 1).toUpperCase());
  return <main className="shell experience-shell private-club-shell">
    <section className={`shell-panel experience-panel ${wide ? 'shell-panel-wide' : ''}`}>
      <header className="brand-header experience-header private-brand-header" id="club-header">
        <img className="brand-mark" src="/brand/misfits-501.jpg" alt="Misfits 501 club seal" />
        <div className="brand-meta"><p className="brand-name">Misfits Darts Club</p><span className="online-label">Throw together. Stand together.</span></div>
        {user && <div className="header-user">{onProfile ? <button className="avatar header-avatar-button" type="button" aria-label="Open profile" onClick={onProfile}>{avatar}</button> : <div className="avatar">{avatar}</div>}{onSignOut && <button className="header-signout" type="button" onClick={onSignOut}>Sign out</button>}</div>}
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
  const [adminSelectedLeagueId, setAdminSelectedLeagueId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [clubLoadError, setClubLoadError] = useState('');
  const [profileRequestKey, setProfileRequestKey] = useState(0);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const clearClubData = () => {
    setClubLeagues([]);
    setMyLeagues([]);
    setAdminSelectedLeagueId(null);
    setClubLoadError('');
  };

  const loadApprovedClub = async () => {
    setClubLoadError('');
    try {
      const [clubPayload, personalPayload] = await Promise.all([api.leagues(), api.myLeagues()]);
      setClubLeagues(clubPayload.leagues);
      setMyLeagues(personalPayload.leagues);
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
    setMessage('');
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
      if (error instanceof ApiClientError && error.status === 403 && /suspended/i.test(error.message)) {
        setView('suspended');
        setMessage('This account is suspended');
        return;
      }
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
        else if (error instanceof ApiClientError && error.code === 'FORBIDDEN' && /suspended/i.test(error.message)) {
          setView('suspended');
          setMessage('This account is suspended');
        }
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
    setProfileRequestKey(0);
    setView('signed-out');
    setMessage('Private club access');
  };

  const saveUser = (saved: UserSummary) => setUser(saved);
  const handleLeagueCreated = (league: LeagueSummary) => {
    setClubLeagues((current) => current.some((item) => item.id === league.id) ? current.map((item) => item.id === league.id ? league : item) : [league, ...current]);
    setAdminSelectedLeagueId(league.id);
  };
  const handleLeagueChanged = (league: LeagueSummary) => {
    setClubLeagues((current) => current.some((item) => item.id === league.id) ? current.map((item) => item.id === league.id ? league : item) : current);
    setMyLeagues((current) => current.map((item) => item.id === league.id ? league : item));
  };
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

  if (view === 'suspended') {
    return <ClubShell><section className="private-entry-state membership-state" aria-labelledby="suspended-account-title"><span className="private-entry-icon"><AppIcon name="lock" /></span><p className="entry-kicker">Private club access</p><h1 id="suspended-account-title">Account suspended</h1><p className="entry-copy">This account cannot sign in to Misfits while it is suspended.</p><p className="form-help">Contact a club administrator if you think this needs reviewing.</p><button className="secondary-button private-signout-button" type="button" onClick={() => { setView('signed-out'); setMessage('Private club access'); }}>Return to sign in</button></section></ClubShell>;
  }

  if (view === 'onboarding' && user) {
    return <ClubShell user={user} onSignOut={() => void logout()}><form className="onboarding-form private-onboarding-card" onSubmit={submitUsername}><div className="form-heading"><p className="entry-kicker">Membership approved</p><h1>Set your player nickname</h1><p className="form-help">This is how your name will appear to other approved club members on tables and results.</p></div><label htmlFor="username">Nickname</label><input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. Bullseye Billy" autoComplete="nickname" maxLength={24} required /><button className="primary-button" type="submit">Enter Misfits</button>{message && message !== 'Choose the name your club will see.' && <p className="form-help" role="status">{message}</p>}</form></ClubShell>;
  }

  return <ClubShell user={user} wide onProfile={() => setProfileRequestKey((current) => current + 1)}>
    {view === 'signed-in' && user && <div className="account-panel signed-in-experience private-member-app">
      {clubLoadError && <div className="experience-empty experience-error" role="alert"><strong>{clubLoadError}</strong><button className="secondary-button" type="button" onClick={() => void loadApprovedClub()}>Retry club workspace</button></div>}
      {user.role === 'ADMIN' && adminMode && <div className="admin-workbench"><div className="admin-workbench-entry"><button className="secondary-button admin-back-button" type="button" onClick={() => setAdminMode(false)}>Back to club</button><p className="form-help">Club administration</p></div><AdminCompetitionDesk user={user} selectedLeagueId={adminSelectedLeagueId} onLeagueCreated={handleLeagueCreated} onLeagueChanged={handleLeagueChanged} onLeagueSelected={(league) => setAdminSelectedLeagueId(league?.id ?? null)} /></div>}
      {(!adminMode || user.role !== 'ADMIN') && !clubLoadError && <div className="member-workbench member-area"><MemberApp user={user} clubLeagues={clubLeagues} myLeagues={myLeagues} onUserSaved={saveUser} onOpenAdmin={user.role === 'ADMIN' ? () => setAdminMode(true) : undefined} onSignOut={() => void logout()} profileRequestKey={profileRequestKey} /></div>}
    </div>}
  </ClubShell>;
}
