import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ApiClient, type AdminInvite, type AdminPlayer, type AdminPlayerChanges, type LeagueSummary, type ResultInput, type ResultSummary, type UserSummary } from '../api';
import { shareLeague } from '../share';

const api = new ApiClient();

interface AdminLeagueDeskProps {
  user: UserSummary;
  selectedLeagueId?: string | null;
  onLeagueSelected?: (league: LeagueSummary | null) => void;
  onLeagueCreated?: (league: LeagueSummary) => void;
  onLeagueChanged?: (league: LeagueSummary) => void;
}

type AdminView = 'season' | 'members' | 'results' | 'people';
const adminViews: Array<{ key: AdminView; label: string; panelId: string }> = [
  { key: 'season', label: 'Season', panelId: 'admin-season-panel' },
  { key: 'members', label: 'Members & invites', panelId: 'admin-members-panel' },
  { key: 'results', label: 'Results', panelId: 'admin-results-panel' },
  { key: 'people', label: 'Club access', panelId: 'admin-people-panel' },
];

function resultInput(result: ResultSummary) {
  return { playerAId: result.playerAId, playerBId: result.playerBId, playerALegs: result.playerALegs, playerBLegs: result.playerBLegs, playerAAverage: result.playerAAverage, playerBAverage: result.playerBAverage };
}

interface ResultEditorState extends ResultInput {
  id: string;
  status: ResultSummary['status'];
  disputeNote: string;
}

function resultEditor(result: ResultSummary): ResultEditorState {
  return {
    id: result.id,
    playerAId: result.playerAId,
    playerBId: result.playerBId,
    playerALegs: result.playerALegs,
    playerBLegs: result.playerBLegs,
    playerAAverage: result.playerAAverage,
    playerBAverage: result.playerBAverage,
    status: result.status,
    disputeNote: result.disputeNote ?? '',
  };
}

async function copyText(value: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function AdminLeagueDesk({ user, selectedLeagueId, onLeagueSelected, onLeagueCreated, onLeagueChanged }: AdminLeagueDeskProps) {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState<Array<{ userId: string; username: string | null; profileImageUrl: string | null; active: boolean }>>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newSeason, setNewSeason] = useState('2026');
  const [newCapacity, setNewCapacity] = useState('16');
  const [newRepeats, setNewRepeats] = useState('1');
  const [newTargetLegs, setNewTargetLegs] = useState('3');
  const [newPointsPerWin, setNewPointsPerWin] = useState('2');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [editName, setEditName] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editRepeats, setEditRepeats] = useState('');
  const [editTargetLegs, setEditTargetLegs] = useState('');
  const [editPointsPerWin, setEditPointsPerWin] = useState('');
  const [editStatus, setEditStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [resultPlayerA, setResultPlayerA] = useState('');
  const [resultPlayerB, setResultPlayerB] = useState('');
  const [resultPlayerALegs, setResultPlayerALegs] = useState('');
  const [resultPlayerBLegs, setResultPlayerBLegs] = useState('');
  const [resultPlayerAAverage, setResultPlayerAAverage] = useState('');
  const [resultPlayerBAverage, setResultPlayerBAverage] = useState('');
  const [editingResult, setEditingResult] = useState<ResultEditorState | null>(null);
  const [adminView, setAdminView] = useState<AdminView>('season');
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceRequest = useRef(0);

  useEffect(() => {
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const confirmModalRef = useRef<HTMLDivElement>(null);
  const confirmTriggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmWasOpen = useRef(false);

  useEffect(() => {
    if (confirmModal) {
      confirmWasOpen.current = true;
      setTimeout(() => {
        const dialog = confirmModalRef.current;
        const cancelButton = dialog?.querySelector<HTMLButtonElement>('.secondary-button');
        cancelButton?.focus();
      }, 0);

      const onKeyDown = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') {
          setConfirmModal(null);
          return;
        }
        if (event.key !== 'Tab') return;
        const dialog = confirmModalRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>('button');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
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
    if (confirmWasOpen.current) {
      confirmWasOpen.current = false;
      confirmTriggerRef.current?.focus();
    }
  }, [confirmModal]);

  const activeSelectedId = selectedLeagueId ?? selectedId;
  const selectedLeague = leagues.find((league) => league.id === activeSelectedId) ?? null;
  const activeMembers = members.filter((member) => member.active);

  const load = async () => {
    setError('');
    try {
      const leaguePayload = await api.adminLeagues();
      setLeagues(leaguePayload.leagues);
      if (user.role === 'ADMIN') {
        const playerPayload = await api.adminPlayers();
        setPlayers(playerPayload.players);
      } else {
        setPlayers([]);
      }
      setSelectedId((current) => current || leaguePayload.leagues[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Admin data could not be loaded.');
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const request = ++workspaceRequest.current;
    if (!selectedLeague) { onLeagueSelected?.(null); return; }
    setEditName(selectedLeague.name);
    setEditSeason(selectedLeague.seasonName);
    setEditCapacity(String(selectedLeague.maxPlayers));
    setEditRepeats(String(selectedLeague.matchesPerPair));
    setEditTargetLegs(String(selectedLeague.targetLegs));
    setEditPointsPerWin(String(selectedLeague.pointsPerWin));
    setEditStatus(selectedLeague.status);
    setEditVisibility(selectedLeague.visibility);
    setEditingResult(null);
    setMembers([]);
    setInvites([]);
    setResults([]);
    onLeagueSelected?.(selectedLeague);
    Promise.all([api.adminMembers(selectedLeague.id), api.adminInvites(selectedLeague.id), api.adminResults(selectedLeague.id)]).then(([memberPayload, invitePayload, resultPayload]) => {
      if (request !== workspaceRequest.current) return;
      setMembers(memberPayload.members);
      setInvites(invitePayload.invites);
      setResults(resultPayload.results);
    }).catch((cause: unknown) => { if (request === workspaceRequest.current) setError(cause instanceof Error ? cause.message : 'League workspace could not be loaded.'); });
  }, [activeSelectedId, selectedLeague?.id]);

  const createLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('create');
    setError('');
    try {
      const result = await api.createAdminLeague({
        name: newName,
        seasonName: newSeason,
        maxPlayers: Number(newCapacity),
        matchesPerPair: Number(newRepeats),
        targetLegs: Number(newTargetLegs),
        pointsPerWin: Number(newPointsPerWin),
        visibility: newVisibility,
      });
      setLeagues((current) => [...current, result.league]);
      setSelectedId(result.league.id);
      onLeagueCreated?.(result.league);
      setNewName('');
      setNewVisibility('PRIVATE');
      setMessage('League created.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'League could not be created.');
    } finally {
      setBusy(null);
    }
  };

  const saveLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeague) return;
    setBusy('save-league');
    try {
      const result = await api.updateAdminLeague(selectedLeague.id, {
        name: editName,
        seasonName: editSeason,
        maxPlayers: Number(editCapacity),
        matchesPerPair: Number(editRepeats),
        targetLegs: Number(editTargetLegs),
        pointsPerWin: Number(editPointsPerWin),
        status: editStatus,
        visibility: editVisibility,
      });
      setLeagues((current) => current.map((league) => league.id === result.league.id ? result.league : league));
      onLeagueChanged?.(result.league);
      setMessage('League settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'League settings could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const createInvite = async () => {
    if (!selectedLeague) return;
    setBusy('invite');
    try {
      const result = await api.createInvite(selectedLeague.id);
      setInviteUrl(result.invite.url);
      setInvites((current) => [{ id: result.invite.id, leagueId: result.invite.leagueId, expiresAt: result.invite.expiresAt, uses: 0, revokedAt: null, createdAt: new Date().toISOString() }, ...current]);
      const copied = await copyText(result.invite.url);
      if (copied) {
        if (copyTimer.current) clearTimeout(copyTimer.current);
        setCopiedAction('invite');
        copyTimer.current = setTimeout(() => setCopiedAction(null), 2000);
      }
      setMessage(copied ? 'Invite link copied.' : 'Invite link ready to copy.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invite could not be created.');
    } finally {
      setBusy(null);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    const copied = await copyText(inviteUrl);
    if (copied) {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      setCopiedAction('invite');
      copyTimer.current = setTimeout(() => setCopiedAction(null), 2000);
    }
    setMessage(copied ? 'Invite link copied.' : 'Invite link ready to copy.');
  };

  const sharePublicLeague = async () => {
    if (!selectedLeague || selectedLeague.visibility !== 'PUBLIC') return;
    setBusy('share');
    setError('');
    try {
      const mode = await shareLeague(navigator, selectedLeague.name, selectedLeague.slug, window.location.origin);
      if (mode === 'copied') {
        if (copyTimer.current) clearTimeout(copyTimer.current);
        setCopiedAction('share');
        copyTimer.current = setTimeout(() => setCopiedAction(null), 2000);
      }
      setMessage(mode === 'shared' ? 'Share sheet opened.' : 'League link copied.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'League link could not be shared.');
    } finally {
      setBusy(null);
    }
  };

  const revokeInvite = (invite: AdminInvite, triggerEl?: HTMLButtonElement | null) => {
    if (invite.revokedAt) return;
    if (triggerEl) confirmTriggerRef.current = triggerEl;
    setConfirmModal({
      title: 'Revoke invite link?',
      message: 'Are you sure you want to revoke this invite link? It will no longer be usable.',
      onConfirm: async () => {
        setBusy(`invite-${invite.id}`);
        try {
          await api.revokeInvite(invite.id);
          setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, revokedAt: new Date().toISOString() } : item));
          setMessage('Invite revoked.');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Invite could not be revoked.');
        } finally {
          setBusy(null);
        }
      }
    });
  };

  const createResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeague) return;
    setBusy('create-result');
    setError('');
    try {
      const saved = await api.createAdminResult(selectedLeague.id, {
        playerAId: resultPlayerA,
        playerBId: resultPlayerB,
        playerALegs: Number(resultPlayerALegs),
        playerBLegs: Number(resultPlayerBLegs),
        playerAAverage: Number(resultPlayerAAverage),
        playerBAverage: Number(resultPlayerBAverage),
      });
      setResults((current) => [saved.result, ...current]);
      setResultPlayerA('');
      setResultPlayerB('');
      setResultPlayerALegs('');
      setResultPlayerBLegs('');
      setResultPlayerAAverage('');
      setResultPlayerBAverage('');
      setMessage('Confirmed result entered.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be entered.');
    } finally {
      setBusy(null);
    }
  };

  const updateMember = async (userId: string, active: boolean) => {
    if (!selectedLeague) return;
    setBusy(`member-${userId}`);
    try {
      await api.updateMember(selectedLeague.id, userId, active);
      setMembers((current) => current.map((member) => member.userId === userId ? { ...member, active } : member));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Member access could not be changed.');
    } finally {
      setBusy(null);
    }
  };

  const updateResult = async (result: ResultSummary, status: ResultSummary['status']) => {
    setBusy(`result-${result.id}`);
    try {
      const saved = await api.updateAdminResult(result.id, { ...resultInput(result), status });
      setResults((current) => current.map((item) => item.id === result.id ? saved.result : item));
      setMessage('Result updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be updated.');
    } finally {
      setBusy(null);
    }
  };

  const startResultEdit = (result: ResultSummary) => setEditingResult(resultEditor(result));

  const updateResultEditor = <K extends keyof ResultEditorState>(field: K, value: ResultEditorState[K]) => {
    setEditingResult((current) => current ? { ...current, [field]: value } : current);
  };

  const saveResultEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingResult) return;
    setBusy(`edit-result-${editingResult.id}`);
    try {
      const saved = await api.updateAdminResult(editingResult.id, {
        playerAId: editingResult.playerAId,
        playerBId: editingResult.playerBId,
        playerALegs: Number(editingResult.playerALegs),
        playerBLegs: Number(editingResult.playerBLegs),
        playerAAverage: Number(editingResult.playerAAverage),
        playerBAverage: Number(editingResult.playerBAverage),
        status: editingResult.status,
        disputeNote: editingResult.disputeNote.trim() || null,
      });
      setResults((current) => current.map((item) => item.id === saved.result.id ? saved.result : item));
      setEditingResult(null);
      setMessage('Result updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be updated.');
    } finally {
      setBusy(null);
    }
  };

  const deleteResult = (result: ResultSummary, triggerEl?: HTMLButtonElement | null) => {
    if (triggerEl) confirmTriggerRef.current = triggerEl;
    setConfirmModal({
      title: 'Delete this result?',
      message: 'Are you sure you want to delete this result? This action cannot be undone.',
      onConfirm: async () => {
        setBusy(`result-${result.id}`);
        try {
          await api.deleteAdminResult(result.id);
          setResults((current) => current.filter((item) => item.id !== result.id));
          setMessage('Result deleted.');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Result could not be deleted.');
        } finally {
          setBusy(null);
        }
      }
    });
  };

  const updatePlayer = async (id: string, changes: AdminPlayerChanges) => {
    setBusy(`player-${id}`);
    try {
      const result = await api.updateAdminPlayer(id, changes);
      setPlayers((current) => current.map((player) => player.id === id ? result.player : player));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Player access could not be changed.');
    } finally {
      setBusy(null);
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const visibleViews = user.role === 'ADMIN' ? adminViews : adminViews.filter((v) => v.key !== 'people');
    let nextIndex = index;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % visibleViews.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + visibleViews.length) % visibleViews.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visibleViews.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextView = visibleViews[nextIndex];
    setAdminView(nextView.key);
    const nextTabEl = document.getElementById(`admin-tab-${nextView.key}`);
    nextTabEl?.focus();
  };

  const visibleViews = user.role === 'ADMIN' ? adminViews : adminViews.filter((v) => v.key !== 'people');

  return (
    <section className="admin-desk" aria-labelledby="admin-title">
      <div className="workspace-heading">
        <div>
          <h2 id="admin-title">Season admin</h2>
        </div>
        <button className="refresh-button" type="button" onClick={() => void load()} disabled={busy !== null}>
          Refresh
        </button>
      </div>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="admin-tabs" role="tablist" aria-label="Season admin tasks">
        {visibleViews.map((view, idx) => {
          const isSelected = adminView === view.key;
          return (
            <button
              key={view.key}
              id={`admin-tab-${view.key}`}
              role="tab"
              aria-selected={isSelected ? 'true' : 'false'}
              aria-controls={view.panelId}
              tabIndex={isSelected ? 0 : -1}
              className={isSelected ? 'content-tab content-tab-active' : 'content-tab'}
              type="button"
              onClick={() => setAdminView(view.key)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      <div
        id="admin-season-panel"
        role="tabpanel"
        aria-labelledby="admin-tab-season"
        hidden={adminView !== 'season'}
      >
        <div className="admin-block">
          <div className="section-heading">
            <div>
              <h3>Your seasons</h3>
            </div>
            <span className="count-label">{leagues.length}</span>
          </div>
          <div className="league-picker">
            {leagues.map((league) => (
              <button
                type="button"
                key={league.id}
                className={league.id === activeSelectedId ? 'picker-item picker-item-active' : 'picker-item'}
                onClick={() => {
                  setSelectedId(league.id);
                  onLeagueSelected?.(league);
                }}
              >
                <strong>{league.name}</strong>
                <span>{league.seasonName} / {league.status} / {league.visibility.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedLeague && (
          <form
            className="admin-block stack-form"
            aria-labelledby="league-settings-title"
            onSubmit={saveLeague}
          >
            <div className="section-heading">
              <div>
                <h3 id="league-settings-title">{selectedLeague.name} · {selectedLeague.seasonName}</h3>
              </div>
              <span className={`status-label status-${selectedLeague.status.toLowerCase()}`}>
                {selectedLeague.status}
              </span>
            </div>

            <label htmlFor="edit-league-name">
              Club name
              <input
                id="edit-league-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </label>
            <label htmlFor="edit-season">
              Season
              <input
                id="edit-season"
                value={editSeason}
                onChange={(event) => setEditSeason(event.target.value)}
                required
              />
            </label>
            <div className="form-grid">
              <label htmlFor="edit-capacity">
                Max players
                <select id="edit-capacity" value={editCapacity} onChange={(event) => setEditCapacity(event.target.value)} required>
                  {[4,6,8,10,12,16,20,24,32].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label htmlFor="edit-repeats">
                Matches per pair
                <select id="edit-repeats" value={editRepeats} onChange={(event) => setEditRepeats(event.target.value)} required>
                  <option value="1">1 — single round</option>
                  <option value="2">2 — home &amp; away</option>
                  <option value="3">3 — triple round</option>
                </select>
              </label>
              <label htmlFor="edit-target-legs">
                Legs to win
                <select id="edit-target-legs" value={editTargetLegs} onChange={(event) => setEditTargetLegs(event.target.value)} required>
                  <option value="1">1 leg</option>
                  <option value="3">Best of 3</option>
                  <option value="5">Best of 5</option>
                  <option value="7">Best of 7</option>
                </select>
              </label>
              <label htmlFor="edit-points-per-win">
                Points per win
                <select id="edit-points-per-win" value={editPointsPerWin} onChange={(event) => setEditPointsPerWin(event.target.value)} required>
                  <option value="1">1 pt</option>
                  <option value="2">2 pts</option>
                  <option value="3">3 pts</option>
                </select>
              </label>
            </div>
            <label htmlFor="edit-status">
              Season state
              <select
                id="edit-status"
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as 'OPEN' | 'CLOSED')}
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
            <label htmlFor="edit-visibility">
              Visibility
              <select
                id="edit-visibility"
                value={editVisibility}
                onChange={(event) => setEditVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={busy === 'save-league'} aria-busy={busy === 'save-league'}>
              {busy === 'save-league' ? 'Saving' : 'Save settings'}
            </button>
            {selectedLeague.visibility === 'PUBLIC' && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => void sharePublicLeague()}
                disabled={busy === 'share'}
              >
                {copiedAction === 'share' ? 'Copied! ✓' : busy === 'share' ? 'Sharing' : 'Share season'}
              </button>
            )}
          </form>
        )}

        <details className="create-season-disclosure admin-block">
          <summary>Create a new season</summary>
          <form className="compact-form create-league-form" aria-labelledby="create-league-title" onSubmit={createLeague}>
            <div className="create-form-intro">
              <h3 id="create-league-title">New season</h3>
              <p className="form-help">Set the rules first, then invite players to join.</p>
            </div>
            <fieldset>
              <legend>Identity</legend>
              <label htmlFor="new-league-name">
                Club name
                <input
                  id="new-league-name"
                  placeholder="e.g. Misfits 501"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  required
                />
              </label>
              <label htmlFor="new-season">
                Season
                <input
                  id="new-season"
                  value={newSeason}
                  onChange={(event) => setNewSeason(event.target.value)}
                  required
                />
              </label>
            </fieldset>
            <fieldset>
              <legend>Rules</legend>
              <div className="form-grid">
                <label htmlFor="new-capacity">
                  Max players
                  <select id="new-capacity" value={newCapacity} onChange={(event) => setNewCapacity(event.target.value)} required>
                    {[4,6,8,10,12,16,20,24,32].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label htmlFor="new-repeats">
                  Matches per pair
                  <select id="new-repeats" value={newRepeats} onChange={(event) => setNewRepeats(event.target.value)} required>
                    <option value="1">1 — single round</option>
                    <option value="2">2 — home &amp; away</option>
                    <option value="3">3 — triple round</option>
                  </select>
                </label>
                <label htmlFor="new-target-legs">
                  Legs to win
                  <select id="new-target-legs" value={newTargetLegs} onChange={(event) => setNewTargetLegs(event.target.value)} required>
                    <option value="1">1 leg</option>
                    <option value="3">Best of 3</option>
                    <option value="5">Best of 5</option>
                    <option value="7">Best of 7</option>
                  </select>
                </label>
                <label htmlFor="new-points-per-win">
                  Points per win
                  <select id="new-points-per-win" value={newPointsPerWin} onChange={(event) => setNewPointsPerWin(event.target.value)} required>
                    <option value="1">1 pt</option>
                    <option value="2">2 pts</option>
                    <option value="3">3 pts</option>
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Access</legend>
              <label htmlFor="new-visibility">
                Visibility
                <select
                  id="new-visibility"
                  value={newVisibility}
                  onChange={(event) => setNewVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </label>
            </fieldset>
            <button className="primary-button" type="submit" disabled={busy === 'create'} aria-busy={busy === 'create'}>
              {busy === 'create' ? 'Creating' : 'Create season'}
            </button>
          </form>
        </details>
      </div>

      <div
        id="admin-members-panel"
        role="tabpanel"
        aria-labelledby="admin-tab-members"
        hidden={adminView !== 'members'}
      >
        <div className="admin-block">
          <div className="section-heading">
            <h3>Invites</h3>
            <span className="count-label">{invites.length}</span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void createInvite()}
            disabled={busy === 'invite'}
          >
            {busy === 'invite' ? 'Creating link' : 'Create invite link'}
          </button>
          {inviteUrl && (
            <div className="invite-box">
              <code>{inviteUrl}</code>
              <button className="action-button" type="button" onClick={() => void copyInvite()}>
                {copiedAction === 'invite' ? 'Copied! ✓' : 'Copy link'}
              </button>
            </div>
          )}
          <ul className="admin-list">
            {invites.map((invite) => (
              <li key={invite.id}>
                <div>
                  <strong>{invite.revokedAt ? 'Revoked invite' : 'Active invite'}</strong>
                  <small>
                    {invite.uses} {invite.uses === 1 ? 'use' : 'uses'}
                    {invite.expiresAt ? ` / expires ${invite.expiresAt.slice(0, 10)}` : ''}
                  </small>
                </div>
                {!invite.revokedAt && (
                  <button
                    className="action-button"
                    type="button"
                    disabled={busy === `invite-${invite.id}`}
                    onClick={(event) => revokeInvite(invite, event.currentTarget)}
                  >
                    Revoke invite
                  </button>
                )}
              </li>
            ))}
          </ul>
          {invites.length === 0 && <p className="empty-message">No invite links yet.</p>}
        </div>
        {selectedLeague && (
          <div className="admin-block">
            <div className="section-heading">
              <h3>Members</h3>
              <span className="count-label">
                {activeMembers.length}/{selectedLeague.maxPlayers}
              </span>
            </div>
            <ul className="admin-list">
              {members.map((member) => (
                <li key={member.userId}>
                  <div>
                    <strong>{member.username ?? 'Name pending'}</strong>
                    <small>{member.active ? 'Active' : 'Inactive'}</small>
                  </div>
                  <button
                    className="action-button"
                    type="button"
                    disabled={busy === `member-${member.userId}`}
                    onClick={() => void updateMember(member.userId, !member.active)}
                  >
                    {member.active ? 'Deactivate' : 'Activate'}
                  </button>
                </li>
              ))}
            </ul>
            {members.length === 0 && <p className="empty-message">No members yet.</p>}
          </div>
        )}
      </div>

      <div
        id="admin-results-panel"
        role="tabpanel"
        aria-labelledby="admin-tab-results"
        hidden={adminView !== 'results'}
      >
        {selectedLeague && (
          <>
            <form className="admin-block stack-form" onSubmit={createResult}>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">HISTORICAL RESULT</p>
                  <h3>Record a result</h3>
                </div>
                <span className="count-label">Confirmed</span>
              </div>
              <label htmlFor="admin-result-player-a">Player A</label>
              <select
                id="admin-result-player-a"
                value={resultPlayerA}
                onChange={(event) => setResultPlayerA(event.target.value)}
                required
              >
                <option value="">Choose player</option>
                {activeMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.username ?? 'Name pending'}
                  </option>
                ))}
              </select>
              <label htmlFor="admin-result-player-b">Player B</label>
              <select
                id="admin-result-player-b"
                value={resultPlayerB}
                onChange={(event) => setResultPlayerB(event.target.value)}
                required
              >
                <option value="">Choose player</option>
                {activeMembers
                  .filter((member) => member.userId !== resultPlayerA)
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.username ?? 'Name pending'}
                    </option>
                  ))}
              </select>
              <div className="form-grid">
                <label htmlFor="admin-result-player-a-legs">
                  Player A legs
                  <input
                    id="admin-result-player-a-legs"
                    type="number"
                    min="0"
                    max={selectedLeague.targetLegs}
                    value={resultPlayerALegs}
                    onChange={(event) => setResultPlayerALegs(event.target.value)}
                    required
                  />
                </label>
                <label htmlFor="admin-result-player-b-legs">
                  Player B legs
                  <input
                    id="admin-result-player-b-legs"
                    type="number"
                    min="0"
                    max={selectedLeague.targetLegs}
                    value={resultPlayerBLegs}
                    onChange={(event) => setResultPlayerBLegs(event.target.value)}
                    required
                  />
                </label>
                <label htmlFor="admin-result-player-a-average">
                  Player A average
                  <input
                    id="admin-result-player-a-average"
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    value={resultPlayerAAverage}
                    onChange={(event) => setResultPlayerAAverage(event.target.value)}
                    required
                  />
                </label>
                <label htmlFor="admin-result-player-b-average">
                  Player B average
                  <input
                    id="admin-result-player-b-average"
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    value={resultPlayerBAverage}
                    onChange={(event) => setResultPlayerBAverage(event.target.value)}
                    required
                  />
                </label>
              </div>
              <button
                className="primary-button"
                type="submit"
                disabled={busy === 'create-result' || activeMembers.length < 2}
                aria-busy={busy === 'create-result'}
              >
                {busy === 'create-result' ? 'Recording' : 'Record result'}
              </button>
            </form>
            <div className="admin-block">
              <div className="section-heading">
                <h3>Result queue</h3>
                <span className="count-label">{results.length}</span>
              </div>
              <ul className="admin-list">
                {results.map((result) => (
                  <li key={result.id}>
                    <div>
                      <strong>
                        {result.playerAUsername} {result.playerALegs} - {result.playerBLegs} {result.playerBUsername}
                      </strong>
                      <small>
                        {result.status} / {result.playerAAverage.toFixed(2)} - {result.playerBAverage.toFixed(2)}
                      </small>
                    </div>
                    <div className="inline-actions">
                      {result.status !== 'CONFIRMED' && (
                        <button
                          className="action-button"
                          type="button"
                          disabled={busy === `result-${result.id}`}
                          onClick={() => void updateResult(result, 'CONFIRMED')}
                        >
                          Confirm
                        </button>
                      )}
                      <button
                        className="action-button"
                        type="button"
                        disabled={busy === `edit-result-${result.id}`}
                        onClick={() => startResultEdit(result)}
                      >
                        Edit result
                      </button>
                      <button
                        className="action-button"
                        type="button"
                        disabled={busy === `result-${result.id}`}
                        onClick={(event) => deleteResult(result, event.currentTarget)}
                      >
                        Delete
                      </button>
                    </div>
                    {editingResult?.id === result.id && (
                      <form className="result-edit-form stack-form" onSubmit={saveResultEdit}>
                        <label htmlFor={`edit-result-player-a-${result.id}`}>
                          Player A
                          <select
                            id={`edit-result-player-a-${result.id}`}
                            value={editingResult.playerAId}
                            onChange={(event) => updateResultEditor('playerAId', event.target.value)}
                            required
                          >
                            {members.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.username ?? 'Name pending'}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor={`edit-result-player-b-${result.id}`}>
                          Player B
                          <select
                            id={`edit-result-player-b-${result.id}`}
                            value={editingResult.playerBId}
                            onChange={(event) => updateResultEditor('playerBId', event.target.value)}
                            required
                          >
                            {members.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.username ?? 'Name pending'}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="form-grid">
                          <label htmlFor={`edit-result-a-legs-${result.id}`}>
                            Player A legs
                            <input
                              id={`edit-result-a-legs-${result.id}`}
                              type="number"
                              min="0"
                              max={selectedLeague.targetLegs}
                              value={editingResult.playerALegs}
                              onChange={(event) => updateResultEditor('playerALegs', Number(event.target.value))}
                              required
                            />
                          </label>
                          <label htmlFor={`edit-result-b-legs-${result.id}`}>
                            Player B legs
                            <input
                              id={`edit-result-b-legs-${result.id}`}
                              type="number"
                              min="0"
                              max={selectedLeague.targetLegs}
                              value={editingResult.playerBLegs}
                              onChange={(event) => updateResultEditor('playerBLegs', Number(event.target.value))}
                              required
                            />
                          </label>
                          <label htmlFor={`edit-result-a-average-${result.id}`}>
                            Player A average
                            <input
                              id={`edit-result-a-average-${result.id}`}
                              type="number"
                              min="0"
                              max="200"
                              step="0.01"
                              value={editingResult.playerAAverage}
                              onChange={(event) => updateResultEditor('playerAAverage', Number(event.target.value))}
                              required
                            />
                          </label>
                          <label htmlFor={`edit-result-b-average-${result.id}`}>
                            Player B average
                            <input
                              id={`edit-result-b-average-${result.id}`}
                              type="number"
                              min="0"
                              max="200"
                              step="0.01"
                              value={editingResult.playerBAverage}
                              onChange={(event) => updateResultEditor('playerBAverage', Number(event.target.value))}
                              required
                            />
                          </label>
                        </div>
                        <label htmlFor={`edit-result-status-${result.id}`}>
                          Result state
                          <select
                            id={`edit-result-status-${result.id}`}
                            value={editingResult.status}
                            onChange={(event) => updateResultEditor('status', event.target.value as ResultSummary['status'])}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="DISPUTED">Disputed</option>
                          </select>
                        </label>
                        <label htmlFor={`edit-result-note-${result.id}`}>
                          Dispute note
                          <textarea
                            id={`edit-result-note-${result.id}`}
                            value={editingResult.disputeNote}
                            onChange={(event) => updateResultEditor('disputeNote', event.target.value)}
                            maxLength={240}
                          />
                        </label>
                        <div className="inline-actions">
                          <button className="primary-button" type="submit" disabled={busy === `edit-result-${result.id}`} aria-busy={busy === `edit-result-${result.id}`}>
                            {busy === `edit-result-${result.id}` ? 'Saving' : 'Save result'}
                          </button>
                          <button className="secondary-button" type="button" onClick={() => setEditingResult(null)}>
                            Cancel edit
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {results.length === 0 && <p className="empty-message">No results in this league.</p>}
            </div>
          </>
        )}
      </div>

      {user.role === 'ADMIN' && (
        <div
          id="admin-people-panel"
          role="tabpanel"
          aria-labelledby="admin-tab-people"
          hidden={adminView !== 'people'}
          className="admin-block"
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">CLUB ROSTER</p>
              <h3 id="admin-people-heading">Club access</h3>
            </div>
            <span className="count-label">{players.length}</span>
          </div>
          <p className="form-help">Administrators have full access across every season.</p>
          <ul className="admin-list">
            {players.map((player) => (
              <li key={player.id}>
                <div>
                  <strong>{player.username ?? 'Name pending'}</strong>
                  <small>{player.email} / {player.role} / {player.status}</small>
                </div>
                {player.id !== user.id && (
                  <div className="inline-actions">
                    <button
                      className="action-button"
                      type="button"
                      disabled={busy === `player-${player.id}`}
                      onClick={() => void updatePlayer(player.id, { role: player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN' })}
                    >
                      {player.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button
                      className="action-button"
                      type="button"
                      disabled={busy === `player-${player.id}`}
                      onClick={() => void updatePlayer(player.id, { status: player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                    >
                      {player.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {confirmModal && (
        <div className="modal-backdrop">
          <div
            ref={confirmModalRef}
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <h3 id="confirm-modal-title">{confirmModal.title}</h3>
            <p className="form-help">{confirmModal.message}</p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  void confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
