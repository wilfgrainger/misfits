import { useState } from 'react';
import type { UserSummary } from '../api';
import { AppIcon } from './AppIcons';
import { ProfilePanel } from './ProfilePanel';

type PlayerView = 'league' | 'record' | 'results' | 'more';
type MoreView = 'menu' | 'players' | 'profile';

interface EmptyMemberWorkspaceProps {
  user: UserSummary;
  onUserSaved: (user: UserSummary) => void;
  onOpenAdmin?: () => void;
  onSignOut: () => void;
}

export function EmptyMemberWorkspace({ user, onUserSaved, onOpenAdmin, onSignOut }: EmptyMemberWorkspaceProps) {
  const [view, setView] = useState<PlayerView>('league');
  const [moreView, setMoreView] = useState<MoreView>('menu');

  const showMore = (next: MoreView = 'menu') => {
    setMoreView(next);
    setView('more');
  };

  const saveUser = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => {
    onUserSaved({ ...user, ...profile });
  };

  return (
    <section className="player-workspace league-experience empty-club-workspace" aria-label="Member workspace">
      {view === 'league' && <div className="empty-member private-empty-member"><span className="private-entry-icon"><AppIcon name="target" /></span><h2>You're in the club.</h2><p>No league has been published for members yet. Your club access is active while the competition is set up.</p></div>}

      {view === 'record' && <div className="experience-empty"><AppIcon name="record" /><strong>No league to record yet</strong><span>Result entry becomes available after an admin publishes a league and assigns you to it.</span></div>}

      {view === 'results' && <div className="experience-empty"><AppIcon name="results" /><strong>No league results yet</strong><span>Confirmed club results will appear here after the competition is published.</span></div>}

      {view === 'more' && moreView === 'menu' && <nav className="player-more-actions more-menu" aria-label="More player options">
        <button type="button" className="player-more-action" onClick={() => showMore('players')}><AppIcon name="players" /><span>Players</span></button>
        <button type="button" className="player-more-action" onClick={() => showMore('profile')}><AppIcon name="profile" /><span>Profile</span></button>
        {user.role === 'ADMIN' && onOpenAdmin && <button type="button" className="player-more-action" onClick={onOpenAdmin}><AppIcon name="settings" /><span>Admin</span></button>}
        <button type="button" className="player-more-action" onClick={onSignOut}><AppIcon name="logout" /><span>Sign out</span></button>
      </nav>}

      {view === 'more' && moreView === 'players' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><h3>Players</h3><p className="empty-message">The player roster will appear once a league is published.</p></div>}

      {view === 'more' && moreView === 'profile' && <div className="player-more-panel"><button type="button" className="text-button more-back-button" onClick={() => setMoreView('menu')}>Back to More</button><ProfilePanel user={user} onSaved={saveUser} /></div>}

      <nav className="member-app-nav" aria-label="Member workspace navigation">
        <button type="button" className={view === 'league' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'league' ? 'page' : undefined} onClick={() => setView('league')}><AppIcon name="league" /><span>League</span></button>
        <button type="button" className={view === 'record' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'record' ? 'page' : undefined} onClick={() => setView('record')}><AppIcon name="record" /><span>Record</span></button>
        <button type="button" className={view === 'results' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'results' ? 'page' : undefined} onClick={() => setView('results')}><AppIcon name="results" /><span>Results</span></button>
        <button type="button" className={view === 'more' ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'} aria-current={view === 'more' ? 'page' : undefined} onClick={() => showMore('menu')}><AppIcon name="more" /><span>More</span></button>
      </nav>
    </section>
  );
}
