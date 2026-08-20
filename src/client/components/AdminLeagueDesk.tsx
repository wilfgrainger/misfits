import { FormEvent, useEffect, useState } from 'react';
import { ApiClient, type AdminPlayer, type AdminPlayerChanges, type LeagueSummary, type ResultSummary, type UserSummary } from '../api';

const api = new ApiClient();

interface AdminLeagueDeskProps {
  user: UserSummary;
  onLeagueSelected?: (league: LeagueSummary | null) => void;
}

function resultInput(result: ResultSummary) {
  return { playerAId: result.playerAId, playerBId: result.playerBId, playerALegs: result.playerALegs, playerBLegs: result.playerBLegs, playerAAverage: result.playerAAverage, playerBAverage: result.playerBAverage };
}

async function copyText(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value).catch(() => undefined);
  }
}

export function AdminLeagueDesk({ user, onLeagueSelected }: AdminLeagueDeskProps) {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState<Array<{ userId: string; username: string | null; profileImageUrl: string | null; active: boolean }>>([]);
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
  const [editName, setEditName] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editRepeats, setEditRepeats] = useState('');
  const [editStatus, setEditStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');

  const selectedLeague = leagues.find((league) => league.id === selectedId) ?? null;

  const load = async () => {
    setError('');
    try {
      const [leaguePayload, playerPayload] = await Promise.all([api.adminLeagues(), api.adminPlayers()]);
      setLeagues(leaguePayload.leagues);
      setPlayers(playerPayload.players);
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
    setEditStatus(selectedLeague.status);
    onLeagueSelected?.(selectedLeague);
    Promise.all([api.adminMembers(selectedLeague.id), api.adminResults(selectedLeague.id)]).then(([memberPayload, resultPayload]) => {
      setMembers(memberPayload.members);
      setResults(resultPayload.results);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'League workspace could not be loaded.'));
  }, [selectedId]);

  const createLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('create');
    setError('');
    try {
      const result = await api.createAdminLeague({ name: newName, seasonName: newSeason, maxPlayers: Number(newCapacity), matchesPerPair: Number(newRepeats) });
      setLeagues((current) => [...current, result.league]);
      setSelectedId(result.league.id);
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
      const result = await api.updateAdminLeague(selectedLeague.id, { name: editName, seasonName: editSeason, maxPlayers: Number(editCapacity), matchesPerPair: Number(editRepeats), status: editStatus });
      setLeagues((current) => current.map((league) => league.id === result.league.id ? result.league : league));
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
      await copyText(result.invite.url);
      setMessage('Invite link copied.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invite could not be created.'); }
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

  const deleteResult = async (result: ResultSummary) => {
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
      <div className="workspace-heading"><div><p className="section-kicker">LEAGUE CONTROL</p><h2 id="admin-title">Admin desk</h2></div><button className="refresh-button" type="button" onClick={() => void load()} disabled={busy !== null}>Refresh</button></div>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="admin-block"><div className="section-heading"><h3>Leagues</h3><span className="count-label">{leagues.length}</span></div><div className="league-picker">{leagues.map((league) => <button type="button" key={league.id} className={league.id === selectedId ? 'picker-item picker-item-active' : 'picker-item'} onClick={() => setSelectedId(league.id)}><strong>{league.name}</strong><span>{league.seasonName} / {league.status}</span></button>)}</div><form className="compact-form" onSubmit={createLeague}><input aria-label="New league name" placeholder="New league name" value={newName} onChange={(event) => setNewName(event.target.value)} required /><input aria-label="New season" value={newSeason} onChange={(event) => setNewSeason(event.target.value)} required /><input aria-label="Player capacity" type="number" min="2" value={newCapacity} onChange={(event) => setNewCapacity(event.target.value)} required /><input aria-label="Games per pair" type="number" min="1" value={newRepeats} onChange={(event) => setNewRepeats(event.target.value)} required /><button className="primary-button" type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating' : 'Create league'}</button></form></div>
      {selectedLeague && <>
        <form className="admin-block stack-form" onSubmit={saveLeague}><div className="section-heading"><h3>Settings</h3><span className={`status-label status-${selectedLeague.status.toLowerCase()}`}>{selectedLeague.status}</span></div><label htmlFor="edit-league-name">League name</label><input id="edit-league-name" value={editName} onChange={(event) => setEditName(event.target.value)} required /><label htmlFor="edit-season">Season</label><input id="edit-season" value={editSeason} onChange={(event) => setEditSeason(event.target.value)} required /><div className="form-grid"><label htmlFor="edit-capacity">Players<input id="edit-capacity" type="number" min="2" value={editCapacity} onChange={(event) => setEditCapacity(event.target.value)} required /></label><label htmlFor="edit-repeats">Games per pair<input id="edit-repeats" type="number" min="1" value={editRepeats} onChange={(event) => setEditRepeats(event.target.value)} required /></label></div><label htmlFor="edit-status">League state<select id="edit-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value as 'OPEN' | 'CLOSED')}><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label><button className="primary-button" type="submit" disabled={busy === 'save-league'}>{busy === 'save-league' ? 'Saving' : 'Save settings'}</button><button className="secondary-button" type="button" onClick={() => void createInvite()} disabled={busy === 'invite'}>{busy === 'invite' ? 'Creating link' : 'Create invite link'}</button>{inviteUrl && <div className="invite-box"><code>{inviteUrl}</code><button className="action-button" type="button" onClick={() => void copyText(inviteUrl)}>Copy link</button></div>}</form>
        <div className="admin-block"><div className="section-heading"><h3>Members</h3><span className="count-label">{members.filter((member) => member.active).length}/{selectedLeague.maxPlayers}</span></div><ul className="admin-list">{members.map((member) => <li key={member.userId}><div><strong>{member.username ?? 'Name pending'}</strong><small>{member.active ? 'Active' : 'Inactive'}</small></div><button className="action-button" type="button" disabled={busy === `member-${member.userId}`} onClick={() => void updateMember(member.userId, !member.active)}>{member.active ? 'Deactivate' : 'Activate'}</button></li>)}</ul>{members.length === 0 && <p className="empty-message">No members yet.</p>}</div>
        <div className="admin-block"><div className="section-heading"><h3>Result queue</h3><span className="count-label">{results.length}</span></div><ul className="admin-list">{results.map((result) => <li key={result.id}><div><strong>{result.playerAUsername} {result.playerALegs} - {result.playerBLegs} {result.playerBUsername}</strong><small>{result.status} / {result.playerAAverage.toFixed(2)} - {result.playerBAverage.toFixed(2)}</small></div><div className="inline-actions">{result.status !== 'CONFIRMED' && <button className="action-button" type="button" disabled={busy === `result-${result.id}`} onClick={() => void updateResult(result, 'CONFIRMED')}>Confirm</button>}<button className="action-button" type="button" disabled={busy === `result-${result.id}`} onClick={() => void deleteResult(result)}>Delete</button></div></li>)}</ul>{results.length === 0 && <p className="empty-message">No results in this league.</p>}</div>
      </>}
      <div className="admin-block"><div className="section-heading"><h3>People</h3><span className="count-label">{players.length}</span></div><ul className="admin-list">{players.map((player) => <li key={player.id}><div><strong>{player.username ?? 'Name pending'}</strong><small>{player.email} / {player.role} / {player.status}</small></div>{player.id !== user.id && <div className="inline-actions"><button className="action-button" type="button" disabled={busy === `player-${player.id}`} onClick={() => void updatePlayer(player.id, { role: player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN' })}>{player.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}</button><button className="action-button" type="button" disabled={busy === `player-${player.id}`} onClick={() => void updatePlayer(player.id, { status: player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{player.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button></div>}</li>)}</ul></div>
    </section>
  );
}
