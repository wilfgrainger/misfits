import { FormEvent, useEffect, useState } from 'react';
import { ApiClient, type AdminInvite, type AdminPlayer, type AdminPlayerChanges, type LeagueSummary, type ResultInput, type ResultSummary, type UserSummary } from '../api';
import { shareLeague } from '../share';

const api = new ApiClient();

interface AdminLeagueDeskProps {
  user: UserSummary;
  onLeagueSelected?: (league: LeagueSummary | null) => void;
  onLeagueChanged?: (league: LeagueSummary) => void;
}

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

async function copyText(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value).catch(() => undefined);
  }
}

export function AdminLeagueDesk({ user, onLeagueSelected, onLeagueChanged }: AdminLeagueDeskProps) {
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
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
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

  const selectedLeague = leagues.find((league) => league.id === selectedId) ?? null;
  const activeMembers = members.filter((member) => member.active);

  const load = async () => {
    setError('');
    try {
      const leaguePayload = await api.adminLeagues();
      setLeagues(leaguePayload.leagues);
      if (user.isMasterAdmin) {
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
    onLeagueSelected?.(selectedLeague);
    Promise.all([api.adminMembers(selectedLeague.id), api.adminInvites(selectedLeague.id), api.adminResults(selectedLeague.id)]).then(([memberPayload, invitePayload, resultPayload]) => {
      setMembers(memberPayload.members);
      setInvites(invitePayload.invites);
      setResults(resultPayload.results);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'League workspace could not be loaded.'));
  }, [selectedId]);

  const createLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('create');
    setError('');
    try {
      const result = await api.createAdminLeague({ name: newName, seasonName: newSeason, maxPlayers: Number(newCapacity), matchesPerPair: Number(newRepeats), targetLegs: Number(newTargetLegs), pointsPerWin: Number(newPointsPerWin), visibility: newVisibility });
      setLeagues((current) => [...current, result.league]);
      setSelectedId(result.league.id);
      onLeagueChanged?.(result.league);
      setNewName('');
      setMessage('League created.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'League could not be created.'); }
    finally { setBusy(null); }
  };

  const saveLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeague) return;
    setBusy('save-league');
    try {
      const result = await api.updateAdminLeague(selectedLeague.id, { name: editName, seasonName: editSeason, maxPlayers: Number(editCapacity), matchesPerPair: Number(editRepeats), targetLegs: Number(editTargetLegs), pointsPerWin: Number(editPointsPerWin), status: editStatus, visibility: editVisibility });
      setLeagues((current) => current.map((league) => league.id === result.league.id ? result.league : league));
      onLeagueChanged?.(result.league);
      setMessage('League settings saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'League settings could not be saved.'); }
    finally { setBusy(null); }
  };

  const createInvite = async () => {
    if (!selectedLeague) return;
    setBusy('invite');
    try {
      const result = await api.createInvite(selectedLeague.id);
      setInviteUrl(result.invite.url);
      setInvites((current) => [{ id: result.invite.id, leagueId: result.invite.leagueId, expiresAt: result.invite.expiresAt, uses: 0, revokedAt: null, createdAt: new Date().toISOString() }, ...current]);
      await copyText(result.invite.url);
      setMessage('Invite link copied.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invite could not be created.'); }
    finally { setBusy(null); }
  };

  const sharePublicLeague = async () => {
    if (!selectedLeague || selectedLeague.visibility !== 'PUBLIC') return;
    setBusy('share');
    setError('');
    try {
      const mode = await shareLeague(navigator, selectedLeague.name, selectedLeague.slug, window.location.origin);
      setMessage(mode === 'shared' ? 'Share sheet opened.' : 'League link copied.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'League link could not be shared.'); }
    finally { setBusy(null); }
  };

  const revokeInvite = async (invite: AdminInvite) => {
    if (invite.revokedAt || (typeof window !== 'undefined' && !window.confirm('Revoke this invite link?'))) return;
    setBusy(`invite-${invite.id}`);
    try {
      await api.revokeInvite(invite.id);
      setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, revokedAt: new Date().toISOString() } : item));
      setMessage('Invite revoked.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invite could not be revoked.'); }
    finally { setBusy(null); }
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be entered.'); }
    finally { setBusy(null); }
  };

  const updateMember = async (userId: string, active: boolean) => {
    if (!selectedLeague) return;
    setBusy(`member-${userId}`);
    try { await api.updateMember(selectedLeague.id, userId, active); setMembers((current) => current.map((member) => member.userId === userId ? { ...member, active } : member)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Member access could not be changed.'); }
    finally { setBusy(null); }
  };

  const updateResult = async (result: ResultSummary, status: ResultSummary['status']) => {
    setBusy(`result-${result.id}`);
    try { const saved = await api.updateAdminResult(result.id, { ...resultInput(result), status }); setResults((current) => current.map((item) => item.id === result.id ? saved.result : item)); setMessage('Result updated.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be updated.'); }
    finally { setBusy(null); }
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be updated.'); }
    finally { setBusy(null); }
  };

  const deleteResult = async (result: ResultSummary) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this result?')) return;
    setBusy(`result-${result.id}`);
    try { await api.deleteAdminResult(result.id); setResults((current) => current.filter((item) => item.id !== result.id)); setMessage('Result deleted.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be deleted.'); }
    finally { setBusy(null); }
  };

  const updatePlayer = async (id: string, changes: AdminPlayerChanges) => {
    setBusy(`player-${id}`);
    try { const result = await api.updateAdminPlayer(id, changes); setPlayers((current) => current.map((player) => player.id === id ? result.player : player)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Player access could not be changed.'); }
    finally { setBusy(null); }
  };

  return (
    <section className="admin-desk" aria-labelledby="admin-title">
      <div className="workspace-heading"><div><p className="section-kicker">LEAGUE CONTROL</p><h2 id="admin-title">League desk</h2></div><button className="refresh-button" type="button" onClick={() => void load()} disabled={busy !== null}>Refresh</button></div>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="admin-block"><div className="section-heading"><h3>Leagues</h3><span className="count-label">{leagues.length}</span></div><div className="league-picker">{leagues.map((league) => <button type="button" key={league.id} className={league.id === selectedId ? 'picker-item picker-item-active' : 'picker-item'} onClick={() => setSelectedId(league.id)}><strong>{league.name}</strong><span>{league.seasonName} / {league.status} / {league.visibility.toLowerCase()}</span></button>)}</div><form className="compact-form" onSubmit={createLeague}><input aria-label="New league name" placeholder="New league name" value={newName} onChange={(event) => setNewName(event.target.value)} required /><input aria-label="New season" value={newSeason} onChange={(event) => setNewSeason(event.target.value)} required /><input aria-label="Player capacity" type="number" min="2" value={newCapacity} onChange={(event) => setNewCapacity(event.target.value)} required /><input aria-label="Games per pair" type="number" min="1" value={newRepeats} onChange={(event) => setNewRepeats(event.target.value)} required /><input aria-label="New target legs" type="number" min="1" value={newTargetLegs} onChange={(event) => setNewTargetLegs(event.target.value)} required /><input aria-label="New points per win" type="number" min="1" value={newPointsPerWin} onChange={(event) => setNewPointsPerWin(event.target.value)} required /><label htmlFor="new-visibility">Visibility<select id="new-visibility" value={newVisibility} onChange={(event) => setNewVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></select></label><button className="primary-button" type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating' : 'Create league'}</button></form></div>
      {selectedLeague && <>
        <form className="admin-block stack-form" onSubmit={saveLeague}><div className="section-heading"><h3>Settings</h3><span className={`status-label status-${selectedLeague.status.toLowerCase()}`}>{selectedLeague.status}</span></div><label htmlFor="edit-league-name">League name</label><input id="edit-league-name" value={editName} onChange={(event) => setEditName(event.target.value)} required /><label htmlFor="edit-season">Season</label><input id="edit-season" value={editSeason} onChange={(event) => setEditSeason(event.target.value)} required /><div className="form-grid"><label htmlFor="edit-capacity">Players<input id="edit-capacity" type="number" min="2" value={editCapacity} onChange={(event) => setEditCapacity(event.target.value)} required /></label><label htmlFor="edit-repeats">Games per pair<input id="edit-repeats" type="number" min="1" value={editRepeats} onChange={(event) => setEditRepeats(event.target.value)} required /></label><label htmlFor="edit-target-legs">Target legs<input id="edit-target-legs" type="number" min="1" value={editTargetLegs} onChange={(event) => setEditTargetLegs(event.target.value)} required /></label><label htmlFor="edit-points-per-win">Points per win<input id="edit-points-per-win" type="number" min="1" value={editPointsPerWin} onChange={(event) => setEditPointsPerWin(event.target.value)} required /></label></div><label htmlFor="edit-status">League state<select id="edit-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value as 'OPEN' | 'CLOSED')}><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label><label htmlFor="edit-visibility">Visibility<select id="edit-visibility" value={editVisibility} onChange={(event) => setEditVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></select></label><button className="primary-button" type="submit" disabled={busy === 'save-league'}>{busy === 'save-league' ? 'Saving' : 'Save settings'}</button>{selectedLeague.visibility === 'PUBLIC' && <button className="secondary-button" type="button" onClick={() => void sharePublicLeague()} disabled={busy === 'share'}>{busy === 'share' ? 'Sharing' : 'Share league'}</button>}<button className="secondary-button" type="button" onClick={() => void createInvite()} disabled={busy === 'invite'}>{busy === 'invite' ? 'Creating link' : 'Create invite link'}</button>{inviteUrl && <div className="invite-box"><code>{inviteUrl}</code><button className="action-button" type="button" onClick={() => void copyText(inviteUrl)}>Copy link</button></div>}</form>
        <div className="admin-block"><div className="section-heading"><h3>Invites</h3><span className="count-label">{invites.length}</span></div><ul className="admin-list">{invites.map((invite) => <li key={invite.id}><div><strong>{invite.revokedAt ? 'Revoked invite' : 'Active invite'}</strong><small>{invite.uses} {invite.uses === 1 ? 'use' : 'uses'}{invite.expiresAt ? ` / expires ${invite.expiresAt.slice(0, 10)}` : ''}</small></div>{!invite.revokedAt && <button className="action-button" type="button" disabled={busy === `invite-${invite.id}`} onClick={() => void revokeInvite(invite)}>Revoke invite</button>}</li>)}</ul>{invites.length === 0 && <p className="empty-message">No invite links yet.</p>}</div>
        <div className="admin-block"><div className="section-heading"><h3>Members</h3><span className="count-label">{activeMembers.length}/{selectedLeague.maxPlayers}</span></div><ul className="admin-list">{members.map((member) => <li key={member.userId}><div><strong>{member.username ?? 'Name pending'}</strong><small>{member.active ? 'Active' : 'Inactive'}</small></div><button className="action-button" type="button" disabled={busy === `member-${member.userId}`} onClick={() => void updateMember(member.userId, !member.active)}>{member.active ? 'Deactivate' : 'Activate'}</button></li>)}</ul>{members.length === 0 && <p className="empty-message">No members yet.</p>}</div>
        <form className="admin-block stack-form" onSubmit={createResult}><div className="section-heading"><h3>Enter historical result</h3><span className="count-label">Confirmed</span></div><label htmlFor="admin-result-player-a">Player A</label><select id="admin-result-player-a" value={resultPlayerA} onChange={(event) => setResultPlayerA(event.target.value)} required><option value="">Choose player</option>{activeMembers.map((member) => <option key={member.userId} value={member.userId}>{member.username ?? 'Name pending'}</option>)}</select><label htmlFor="admin-result-player-b">Player B</label><select id="admin-result-player-b" value={resultPlayerB} onChange={(event) => setResultPlayerB(event.target.value)} required><option value="">Choose player</option>{activeMembers.filter((member) => member.userId !== resultPlayerA).map((member) => <option key={member.userId} value={member.userId}>{member.username ?? 'Name pending'}</option>)}</select><div className="form-grid"><label htmlFor="admin-result-player-a-legs">Player A legs<input id="admin-result-player-a-legs" type="number" min="0" max={selectedLeague.targetLegs} value={resultPlayerALegs} onChange={(event) => setResultPlayerALegs(event.target.value)} required /></label><label htmlFor="admin-result-player-b-legs">Player B legs<input id="admin-result-player-b-legs" type="number" min="0" max={selectedLeague.targetLegs} value={resultPlayerBLegs} onChange={(event) => setResultPlayerBLegs(event.target.value)} required /></label><label htmlFor="admin-result-player-a-average">Player A average<input id="admin-result-player-a-average" type="number" min="0" max="200" step="0.01" value={resultPlayerAAverage} onChange={(event) => setResultPlayerAAverage(event.target.value)} required /></label><label htmlFor="admin-result-player-b-average">Player B average<input id="admin-result-player-b-average" type="number" min="0" max="200" step="0.01" value={resultPlayerBAverage} onChange={(event) => setResultPlayerBAverage(event.target.value)} required /></label></div><button className="primary-button" type="submit" disabled={busy === 'create-result' || activeMembers.length < 2}>{busy === 'create-result' ? 'Recording' : 'Record confirmed result'}</button></form>
        <div className="admin-block"><div className="section-heading"><h3>Result queue</h3><span className="count-label">{results.length}</span></div><ul className="admin-list">{results.map((result) => <li key={result.id}><div><strong>{result.playerAUsername} {result.playerALegs} - {result.playerBLegs} {result.playerBUsername}</strong><small>{result.status} / {result.playerAAverage.toFixed(2)} - {result.playerBAverage.toFixed(2)}</small></div><div className="inline-actions">{result.status !== 'CONFIRMED' && <button className="action-button" type="button" disabled={busy === `result-${result.id}`} onClick={() => void updateResult(result, 'CONFIRMED')}>Confirm</button>}<button className="action-button" type="button" disabled={busy === `edit-result-${result.id}`} onClick={() => startResultEdit(result)}>Edit result</button><button className="action-button" type="button" disabled={busy === `result-${result.id}`} onClick={() => void deleteResult(result)}>Delete</button></div>{editingResult?.id === result.id && <form className="result-edit-form stack-form" onSubmit={saveResultEdit}><label htmlFor={`edit-result-player-a-${result.id}`}>Player A<select id={`edit-result-player-a-${result.id}`} value={editingResult.playerAId} onChange={(event) => updateResultEditor('playerAId', event.target.value)} required>{members.map((member) => <option key={member.userId} value={member.userId}>{member.username ?? 'Name pending'}</option>)}</select></label><label htmlFor={`edit-result-player-b-${result.id}`}>Player B<select id={`edit-result-player-b-${result.id}`} value={editingResult.playerBId} onChange={(event) => updateResultEditor('playerBId', event.target.value)} required>{members.map((member) => <option key={member.userId} value={member.userId}>{member.username ?? 'Name pending'}</option>)}</select></label><div className="form-grid"><label htmlFor={`edit-result-a-legs-${result.id}`}>Player A legs<input id={`edit-result-a-legs-${result.id}`} type="number" min="0" max={selectedLeague.targetLegs} value={editingResult.playerALegs} onChange={(event) => updateResultEditor('playerALegs', Number(event.target.value))} required /></label><label htmlFor={`edit-result-b-legs-${result.id}`}>Player B legs<input id={`edit-result-b-legs-${result.id}`} type="number" min="0" max={selectedLeague.targetLegs} value={editingResult.playerBLegs} onChange={(event) => updateResultEditor('playerBLegs', Number(event.target.value))} required /></label><label htmlFor={`edit-result-a-average-${result.id}`}>Player A average<input id={`edit-result-a-average-${result.id}`} type="number" min="0" max="200" step="0.01" value={editingResult.playerAAverage} onChange={(event) => updateResultEditor('playerAAverage', Number(event.target.value))} required /></label><label htmlFor={`edit-result-b-average-${result.id}`}>Player B average<input id={`edit-result-b-average-${result.id}`} type="number" min="0" max="200" step="0.01" value={editingResult.playerBAverage} onChange={(event) => updateResultEditor('playerBAverage', Number(event.target.value))} required /></label></div><label htmlFor={`edit-result-status-${result.id}`}>Result state<select id={`edit-result-status-${result.id}`} value={editingResult.status} onChange={(event) => updateResultEditor('status', event.target.value as ResultSummary['status'])}><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="DISPUTED">Disputed</option></select></label><label htmlFor={`edit-result-note-${result.id}`}>Dispute note<textarea id={`edit-result-note-${result.id}`} value={editingResult.disputeNote} onChange={(event) => updateResultEditor('disputeNote', event.target.value)} maxLength={240} /></label><div className="inline-actions"><button className="primary-button" type="submit" disabled={busy === `edit-result-${result.id}`}>{busy === `edit-result-${result.id}` ? 'Saving' : 'Save result'}</button><button className="secondary-button" type="button" onClick={() => setEditingResult(null)}>Cancel edit</button></div></form>}</li>)}</ul>{results.length === 0 && <p className="empty-message">No results in this league.</p>}</div>
      </>}
      {user.isMasterAdmin && <div className="admin-block"><div className="section-heading"><h3>People</h3><span className="count-label">{players.length}</span></div><ul className="admin-list">{players.map((player) => <li key={player.id}><div><strong>{player.username ?? 'Name pending'}</strong><small>{player.email} / {player.role} / {player.status}</small></div>{player.id !== user.id && <div className="inline-actions"><button className="action-button" type="button" disabled={busy === `player-${player.id}`} onClick={() => void updatePlayer(player.id, { role: player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN' })}>{player.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}</button><button className="action-button" type="button" disabled={busy === `player-${player.id}`} onClick={() => void updatePlayer(player.id, { status: player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{player.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button></div>}</li>)}</ul></div>}
    </section>
  );
}
