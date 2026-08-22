import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import {
  ApiClient,
  type AdminInvite,
  type AdminPlayer,
  type CompetitionMember,
  type FixturePreview,
  type FixtureStatus,
  type FixtureSummary,
  type LeagueSummary,
  type PromotionMovement,
  type PromotionProjection,
  type SeasonSummary,
  type UnassignedPlayer,
  type UserSummary,
} from '../api';
import { cloneSeasonStructure } from '../season-clone';
import { copyMembershipBaseline } from '../membership-baseline';
import { shareInvite } from '../invite-share';
import { AdminResultsWorkflow } from './AdminResultsWorkflow';

const api = new ApiClient();

type AdminTask = 'season' | 'leagues' | 'members' | 'fixtures' | 'results' | 'promotion' | 'access';
const tasks: Array<{ key: AdminTask; label: string }> = [
  { key: 'season', label: 'Season' },
  { key: 'leagues', label: 'Leagues' },
  { key: 'members', label: 'Members & invites' },
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'results', label: 'Results' },
  { key: 'promotion', label: 'Promotion' },
  { key: 'access', label: 'Club access' },
];

interface Props {
  user: UserSummary;
  selectedLeagueId?: string | null;
  onLeagueSelected?: (league: LeagueSummary | null) => void;
  onLeagueCreated?: (league: LeagueSummary) => void;
  onLeagueChanged?: (league: LeagueSummary) => void;
}

interface ConfirmState {
  title: string;
  message: string;
  action: () => Promise<void>;
}

function orderLeagues(a: LeagueSummary, b: LeagueSummary) {
  return (a.hierarchyPosition ?? 999) - (b.hierarchyPosition ?? 999) || a.name.localeCompare(b.name);
}

function describeError(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function fixtureLabel(status: FixtureStatus) {
  if (status === 'PENDING_CONFIRMATION') return 'Pending';
  if (status === 'CONFIRMED') return 'Completed';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatExpiry(value: string | null) {
  if (!value) return 'No expiry';
  const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  return `Expires ${formatted.replace('Sept', 'Sep')}`;
}

function describeMatchFormat(maxLegs: number) {
  const legsToWin = Math.floor(maxLegs / 2) + 1;
  if (maxLegs % 2 === 0) {
    const drawLegs = maxLegs / 2;
    return `Best of ${maxLegs}: first to ${legsToWin} wins; ${drawLegs}-${drawLegs} is a draw.`;
  }
  return `Best of ${maxLegs}: first to ${legsToWin} wins; no draw.`;
}

export function AdminCompetitionDesk({ user, selectedLeagueId, onLeagueSelected, onLeagueCreated, onLeagueChanged }: Props) {
  const [task, setTask] = useState<AdminTask>('season');
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [membersByLeague, setMembersByLeague] = useState<Record<string, CompetitionMember[]>>({});
  const [leagueSummariesReady, setLeagueSummariesReady] = useState(false);
  const [unassigned, setUnassigned] = useState<UnassignedPlayer[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [fixturePreview, setFixturePreview] = useState<FixturePreview | null>(null);
  const [fixtureFilter, setFixtureFilter] = useState<'ALL' | FixtureStatus>('ALL');
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [promotion, setPromotion] = useState<PromotionProjection | null>(null);
  const [proposal, setProposal] = useState<PromotionMovement[]>([]);
  const [targetSeasonId, setTargetSeasonId] = useState('');
  const [targetLeagues, setTargetLeagues] = useState<LeagueSummary[]>([]);
  const [overrideTargets, setOverrideTargets] = useState<Record<string, string>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [newSeasonName, setNewSeasonName] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [seasonName, setSeasonName] = useState('');
  const [seasonStatus, setSeasonStatus] = useState<SeasonSummary['status']>('DRAFT');
  const [seasonCurrent, setSeasonCurrent] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newHierarchy, setNewHierarchy] = useState('1');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [leagueEdit, setLeagueEdit] = useState<LeagueSummary | null>(null);
  const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({});
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [baselineSeasonId, setBaselineSeasonId] = useState('');

  const orderedLeagues = useMemo(() => [...leagues].sort(orderLeagues), [leagues]);
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) ?? null;
  const effectiveLeagueId = selectedLeagueId && leagues.some((league) => league.id === selectedLeagueId) ? selectedLeagueId : selectedId;
  const selectedLeague = leagues.find((league) => league.id === effectiveLeagueId) ?? null;
  const memberLeague = selectedLeague ?? orderedLeagues[0] ?? null;
  const leagueSummaryComplete = orderedLeagues.length > 0 && leagueSummariesReady && orderedLeagues.every((league) => Object.prototype.hasOwnProperty.call(membersByLeague, league.id));

  const clear = () => { setMessage(''); setError(''); };

  const selectLeague = (league: LeagueSummary | null) => {
    setSelectedId(league?.id ?? '');
    setLeagueEdit(league ? { ...league } : null);
    onLeagueSelected?.(league);
  };

  const loadCore = async () => {
    clear();
    try {
      const [seasonPayload, playerPayload] = await Promise.all([api.adminSeasons(), api.adminPlayers()]);
      setSeasons(seasonPayload.seasons);
      setPlayers(playerPayload.players);
      const current = seasonPayload.seasons.find((season) => season.isCurrent) ?? seasonPayload.seasons[0] ?? null;
      setSelectedSeasonId((value) => value && seasonPayload.seasons.some((season) => season.id === value) ? value : current?.id ?? '');
      const draft = seasonPayload.seasons.find((season) => season.status === 'DRAFT' && season.id !== current?.id);
      setTargetSeasonId((value) => value || draft?.id || '');
      setBaselineSeasonId((value) => value || draft?.id || '');
    } catch (cause) {
      setError(describeError(cause, 'Competition administration could not be loaded.'));
    }
  };

  useEffect(() => { void loadCore(); }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    setSeasonName(selectedSeason.name);
    setSeasonStatus(selectedSeason.status);
    setSeasonCurrent(selectedSeason.isCurrent);
    setLeagueSummariesReady(false);
    let active = true;
    api.seasonLeagues(selectedSeason.id).then((payload) => {
      if (!active) return;
      const next = [...payload.leagues].sort(orderLeagues);
      setLeagues(next);
      const preferred = selectedLeagueId && next.some((league) => league.id === selectedLeagueId)
        ? next.find((league) => league.id === selectedLeagueId) ?? null
        : next[0] ?? null;
      selectLeague(preferred);
    }).catch((cause) => active && setError(describeError(cause, 'League structure could not be loaded.')));
    return () => { active = false; };
  }, [selectedSeason?.id]);

  useEffect(() => {
    if (!selectedLeagueId) return;
    const match = leagues.find((league) => league.id === selectedLeagueId);
    if (match) selectLeague(match);
  }, [selectedLeagueId]);

  const loadLeagueMembers = async () => {
    setLeagueSummariesReady(false);
    if (orderedLeagues.length === 0) { setLeagueSummariesReady(true); return; }
    try {
      const payloads = await Promise.all(orderedLeagues.map((league) => api.competitionMembers(league.id)));
      const next: Record<string, CompetitionMember[]> = {};
      orderedLeagues.forEach((league, index) => { next[league.id] = payloads[index].members; });
      setMembersByLeague(next);
      setMoveTargets((current) => {
        const copy = { ...current };
        for (const league of orderedLeagues) for (const member of next[league.id] ?? []) copy[member.userId] ||= league.id;
        return copy;
      });
    } catch (cause) {
      setError(describeError(cause, 'League membership could not be loaded.'));
    } finally {
      setLeagueSummariesReady(true);
    }
  };

  const loadRoster = async () => {
    if (!selectedSeason) return;
    try {
      const [unassignedPayload, ...memberPayloads] = await Promise.all([
        api.seasonUnassigned(selectedSeason.id),
        ...orderedLeagues.map((league) => api.competitionMembers(league.id)),
      ]);
      setUnassigned(unassignedPayload.users);
      const next: Record<string, CompetitionMember[]> = {};
      orderedLeagues.forEach((league, index) => { next[league.id] = memberPayloads[index].members; });
      setMembersByLeague(next);
      setAssignmentTargets((current) => {
        const copy = { ...current };
        for (const player of unassignedPayload.users) copy[player.id] ||= memberLeague?.id ?? orderedLeagues[0]?.id ?? '';
        return copy;
      });
      setMoveTargets((current) => {
        const copy = { ...current };
        for (const league of orderedLeagues) for (const member of next[league.id] ?? []) copy[member.userId] ||= league.id;
        return copy;
      });
    } catch (cause) {
      setError(describeError(cause, 'Season membership could not be loaded.'));
    }
  };

  const loadInvites = async () => {
    if (!memberLeague) return setInvites([]);
    try { setInvites((await api.adminInvites(memberLeague.id)).invites); }
    catch (cause) { setError(describeError(cause, 'Invites could not be loaded.')); }
  };

  useEffect(() => {
    clear();
    if (task === 'leagues') void loadLeagueMembers();
    if (task === 'members') { void loadRoster(); void loadInvites(); }
    if (task === 'fixtures' && selectedLeague) api.fixtures(selectedLeague.id).then((payload) => setFixtures(payload.fixtures)).catch((cause) => setError(describeError(cause, 'Fixtures could not be loaded.')));
    if (task === 'promotion' && selectedSeason) Promise.all([api.promotionPreview(selectedSeason.id), ...orderedLeagues.map((league) => api.competitionMembers(league.id))]).then(([preview, ...memberPayloads]) => {
      setPromotion((preview as { preview: PromotionProjection }).preview);
      const next: Record<string, CompetitionMember[]> = {};
      orderedLeagues.forEach((league, index) => { next[league.id] = (memberPayloads[index] as { members: CompetitionMember[] }).members; });
      setMembersByLeague((current) => ({ ...current, ...next }));
    }).catch((cause) => setError(describeError(cause, 'Promotion projection could not be loaded.')));
    if (task === 'access') api.adminPlayers().then((payload) => setPlayers(payload.players)).catch((cause) => setError(describeError(cause, 'Club access could not be loaded.')));
  }, [task, selectedLeague?.id, memberLeague?.id, selectedSeason?.id, leagues.length]);

  useEffect(() => {
    if (task !== 'promotion' || !targetSeasonId) return;
    api.seasonLeagues(targetSeasonId).then((payload) => setTargetLeagues([...payload.leagues].sort(orderLeagues))).catch((cause) => setError(describeError(cause, 'Next-season leagues could not be loaded.')));
  }, [task, targetSeasonId]);

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tasks.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tasks.length) % tasks.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tasks.length - 1;
    else return;
    event.preventDefault();
    setTask(tasks[next].key);
    document.getElementById(`competition-admin-tab-${tasks[next].key}`)?.focus();
  };

  const memberName = (id: string) => {
    for (const rows of Object.values(membersByLeague)) {
      const found = rows.find((member) => member.userId === id);
      if (found) return found.username ?? 'Name pending';
    }
    return players.find((player) => player.id === id)?.username ?? id;
  };
  const leagueName = (id: string | null) => leagues.find((league) => league.id === id)?.name ?? targetLeagues.find((league) => league.id === id)?.name ?? 'Unassigned';

  const createSeason = async (event: FormEvent) => {
    event.preventDefault(); clear(); setBusy('create-season');
    try {
      const payload = await api.createAdminSeason({ name: newSeasonName, status: 'DRAFT', isCurrent: false });
      setSeasons((current) => [...current, payload.season]); setNewSeasonName(''); setMessage('Season created.');
    } catch (cause) { setError(describeError(cause, 'Season could not be created.')); } finally { setBusy(null); }
  };

  const saveSeason = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedSeason) return; clear(); setBusy('save-season');
    try {
      const payload = await api.updateAdminSeason(selectedSeason.id, { name: seasonName, status: seasonStatus, isCurrent: seasonCurrent });
      setSeasons((current) => current.map((season) => season.id === payload.season.id ? payload.season : seasonCurrent ? { ...season, isCurrent: false } : season));
      setMessage('Season settings saved.');
    } catch (cause) { setError(describeError(cause, 'Season could not be updated.')); } finally { setBusy(null); }
  };

  const cloneSeason = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedSeason) return; clear(); setBusy('clone-season');
    try {
      const payload = await cloneSeasonStructure(selectedSeason.id, cloneName);
      setSeasons((current) => [...current, payload.season]); setCloneName(''); setMessage('Season structure copied.');
    } catch (cause) { setError(describeError(cause, 'Season structure could not be copied.')); } finally { setBusy(null); }
  };

  const saveLeague = async (event: FormEvent) => {
    event.preventDefault(); if (!leagueEdit) return; clear(); setBusy('save-league');
    try {
      const payload = await api.updateCompetitionLeague(leagueEdit.id, {
        name: leagueEdit.name, slug: leagueEdit.slug, maxPlayers: leagueEdit.maxPlayers, matchesPerPair: leagueEdit.matchesPerPair,
        maxLegs: leagueEdit.maxLegs, pointsPerWin: leagueEdit.pointsPerWin, pointsPerDraw: leagueEdit.pointsPerDraw, pointsPerLoss: leagueEdit.pointsPerLoss, visibility: leagueEdit.visibility,
        hierarchyPosition: leagueEdit.hierarchyPosition ?? 1, promotionPlaces: leagueEdit.promotionPlaces ?? 0, relegationPlaces: leagueEdit.relegationPlaces ?? 0,
      });
      setLeagues((current) => current.map((league) => league.id === payload.league.id ? payload.league : league).sort(orderLeagues));
      setLeagueEdit({ ...payload.league }); onLeagueChanged?.(payload.league); setMessage('League settings saved.');
    } catch (cause) { setError(describeError(cause, 'League settings could not be saved.')); } finally { setBusy(null); }
  };

  const createLeague = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedSeason) return; clear(); setBusy('create-league');
    try {
      const payload = await api.createSeasonLeague(selectedSeason.id, {
        name: newLeagueName, maxPlayers: 8, matchesPerPair: 1, maxLegs: 5, pointsPerWin: 2, pointsPerDraw: 0, pointsPerLoss: 0, visibility: newVisibility,
        hierarchyPosition: Number(newHierarchy), promotionPlaces: 0, relegationPlaces: 0,
      });
      setLeagues((current) => [...current, payload.league].sort(orderLeagues)); selectLeague(payload.league); onLeagueCreated?.(payload.league);
      setNewLeagueName(''); setNewHierarchy(String(leagues.length + 2)); setNewVisibility('PRIVATE'); setMessage('League created.');
    } catch (cause) { setError(describeError(cause, 'League could not be created.')); } finally { setBusy(null); }
  };

  const assignPlayer = async (player: UnassignedPlayer) => {
    if (!selectedSeason) return; const leagueId = assignmentTargets[player.id]; if (!leagueId) return; clear();
    try { await api.assignSeasonMember(selectedSeason.id, player.id, leagueId); await loadRoster(); setMessage('Player assigned.'); }
    catch (cause) { setError(describeError(cause, 'Player could not be assigned.')); }
  };

  const moveMember = async (member: CompetitionMember) => {
    if (!selectedSeason) return; const target = moveTargets[member.userId]; if (!target || target === member.leagueId) return; clear();
    try { await api.moveSeasonMember(selectedSeason.id, member.userId, member.leagueId, target); await loadRoster(); setMessage('Player moved.'); }
    catch (cause) { setError(describeError(cause, 'Player could not be moved.')); }
  };

  const setMemberActive = async (member: CompetitionMember, active: boolean) => {
    clear();
    try {
      await api.updateMember(member.leagueId, member.userId, active);
      setMembersByLeague((current) => ({ ...current, [member.leagueId]: (current[member.leagueId] ?? []).map((row) => row.userId === member.userId ? { ...row, active } : row) }));
      setMessage(active ? 'League membership reactivated.' : 'League membership deactivated.');
    } catch (cause) { setError(describeError(cause, 'League membership could not be updated.')); }
  };

  const copyBaseline = () => {
    if (!selectedSeason || !baselineSeasonId) return;
    setConfirm({
      title: 'Copy current placements to draft?',
      message: 'This copies reviewed placements into the selected draft. Previous-season membership remains unchanged and can still be adjusted before opening.',
      action: async () => {
        await copyMembershipBaseline(selectedSeason.id, baselineSeasonId);
        setMessage('Draft baseline placements copied.');
      },
    });
  };

  const createInvite = async () => {
    if (!memberLeague) return; clear();
    try {
      const payload = await api.createInvite(memberLeague.id);
      setInviteUrl(payload.invite.url);
      setInvites((current) => [{ id: payload.invite.id, leagueId: payload.invite.leagueId, expiresAt: payload.invite.expiresAt, uses: 0, revokedAt: null, createdAt: new Date().toISOString() }, ...current]);
      setMessage('Invite link ready.');
    } catch (cause) { setError(describeError(cause, 'Invite could not be created.')); }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return; clear();
    try {
      await shareInvite({ share: navigator.share?.bind(navigator), clipboard: navigator.clipboard }, inviteUrl);
      setMessage('Invite link copied.');
    } catch (cause) { setError(describeError(cause, 'Invite link could not be copied.')); }
  };

  const fixtureCounts = {
    outstanding: fixtures.filter((row) => row.status === 'OUTSTANDING').length,
    pending: fixtures.filter((row) => row.status === 'PENDING_CONFIRMATION').length,
    disputed: fixtures.filter((row) => row.status === 'DISPUTED').length,
    completed: fixtures.filter((row) => row.status === 'CONFIRMED').length,
  };
  const visibleFixtures = fixtureFilter === 'ALL' ? fixtures : fixtures.filter((row) => row.status === fixtureFilter);

  const previewFixtures = async () => {
    if (!selectedLeague) return; clear();
    try { setFixturePreview((await api.fixturePreview(selectedLeague.id)).preview); }
    catch (cause) { setError(describeError(cause, 'Fixture preview could not be generated.')); }
  };
  const commitFixtures = async () => {
    if (!selectedLeague) return; clear();
    try { setFixtures((await api.commitFixtures(selectedLeague.id)).fixtures); setMessage('Fixtures committed.'); }
    catch (cause) { setError(describeError(cause, 'Fixtures could not be committed.')); }
  };
  const voidFixture = async (fixture: FixtureSummary) => {
    clear();
    try {
      const payload = await api.setFixtureStatus(fixture.id, fixture.status === 'VOID' ? 'OUTSTANDING' : 'VOID');
      setFixtures((current) => current.map((row) => row.id === fixture.id ? payload.fixture : row));
      setMessage(fixture.status === 'VOID' ? 'Fixture restored.' : 'Fixture voided.');
    } catch (cause) { setError(describeError(cause, 'Fixture could not be updated.')); }
  };

  const createProposal = async () => {
    if (!selectedSeason || !targetSeasonId) return; clear();
    try {
      const payload = await api.createPromotionProposal(selectedSeason.id, targetSeasonId);
      setProposal(payload.movements);
      setOverrideTargets(Object.fromEntries(payload.movements.map((movement) => [movement.userId, movement.toLeagueId ?? ''])));
      setMessage('Promotion proposal created.');
    } catch (cause) { setError(describeError(cause, 'Promotion proposal could not be created.')); }
  };
  const saveOverride = async (movement: PromotionMovement) => {
    if (!selectedSeason) return; clear();
    try {
      const payload = await api.overridePromotionMovement(selectedSeason.id, movement.userId, overrideTargets[movement.userId] ?? '', overrideReasons[movement.userId] ?? '');
      setProposal((current) => current.map((row) => row.userId === movement.userId ? payload.movement : row)); setMessage('Movement override saved.');
    } catch (cause) { setError(describeError(cause, 'Movement override could not be saved.')); }
  };
  const applyProposal = async () => {
    if (!selectedSeason || !targetSeasonId) return; clear();
    try { await api.applyPromotionProposal(selectedSeason.id, targetSeasonId); setMessage('Next-season placements applied.'); }
    catch (cause) { setError(describeError(cause, 'Next-season placements could not be applied.')); }
  };

  const updatePlayer = async (player: AdminPlayer, changes: { role?: AdminPlayer['role']; status?: AdminPlayer['status'] }) => {
    clear();
    try {
      const payload = await api.updateAdminPlayer(player.id, changes);
      setPlayers((current) => current.map((row) => row.id === player.id ? payload.player : row)); setMessage('Club access updated.');
    } catch (cause) { setError(describeError(cause, 'Club access could not be updated.')); }
  };

  return <section className="admin-desk admin-competition-desk" aria-labelledby="competition-admin-title">
    <div className="workspace-heading"><div><h2 id="competition-admin-title">Competition admin</h2><p className="form-help">Season structure, weekly settlement and next-season movement in one place.</p></div><button className="refresh-button" type="button" onClick={() => void loadCore()}>Refresh</button></div>
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}

    <div className="admin-tabs" role="tablist" aria-label="Competition administration tasks">
      {tasks.map((item, index) => <button key={item.key} id={`competition-admin-tab-${item.key}`} role="tab" type="button" className={task === item.key ? 'content-tab content-tab-active' : 'content-tab'} aria-selected={task === item.key} tabIndex={task === item.key ? 0 : -1} onClick={() => setTask(item.key)} onKeyDown={(event) => handleTabKey(event, index)}>{item.label}</button>)}
    </div>

    <div role="tabpanel" hidden={task !== 'season'}>
      <div className="admin-block"><div className="section-heading"><h3>Seasons</h3><span className="count-label">{seasons.length}</span></div><div className="competition-choice-list" role="list" aria-label="Club seasons">{seasons.map((season) => <button key={season.id} type="button" className={season.id === selectedSeasonId ? 'picker-item picker-item-active' : 'picker-item'} onClick={() => setSelectedSeasonId(season.id)}><strong>{season.name}</strong><span>{season.status}{season.isCurrent ? ' · Current' : ''}</span></button>)}</div></div>
      {selectedSeason && <form className="admin-block stack-form" onSubmit={saveSeason}><div className="section-heading"><h3>Season settings</h3>{selectedSeason.isCurrent && <span className="status-label status-open">Current</span>}</div><label>Season name<input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} /></label><label>Season state<select value={seasonStatus} onChange={(e) => setSeasonStatus(e.target.value as SeasonSummary['status'])}><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label><label className="check-row"><input type="checkbox" checked={seasonCurrent} onChange={(e) => setSeasonCurrent(e.target.checked)} /> Current season</label><button className="primary-button" type="submit">Save season</button></form>}
      <details className="admin-disclosure"><summary>Create or copy season</summary><div className="admin-disclosure-body">
        <form className="admin-block stack-form" onSubmit={createSeason}><h3>Create season</h3><label>New season name<input value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} required /></label><button className="primary-button" type="submit" disabled={busy === 'create-season'}>Create season</button></form>
        {selectedSeason && <form className="admin-block stack-form" onSubmit={cloneSeason}><h3>Copy season structure</h3><p className="form-help">Copy leagues and competition rules only. Players, fixtures and results are not copied.</p><label>Copy structure into season<input value={cloneName} onChange={(e) => setCloneName(e.target.value)} required /></label><button className="secondary-button" type="submit">Copy league structure</button></form>}
        {selectedSeason?.status === 'DRAFT' && <button className="secondary-button" type="button" onClick={() => setConfirm({ title: 'Delete empty draft season?', message: 'Only an empty draft can be removed. Competition history is protected by the server.', action: async () => { await api.deleteAdminSeason(selectedSeason.id); setSeasons((current) => current.filter((season) => season.id !== selectedSeason.id)); setSelectedSeasonId(''); setMessage('Draft season deleted.'); } })}>Delete empty draft</button>}
      </div></details>
    </div>

    <div role="tabpanel" hidden={task !== 'leagues'}>
      <div className="admin-block"><div className="section-heading"><h3>League structure</h3><span className="count-label">{orderedLeagues.length}</span></div>{leagueSummaryComplete ? <ul className="competition-league-list" aria-label="Ordered league structure">{orderedLeagues.map((league) => {
        const activeCount = (membersByLeague[league.id] ?? []).filter((member) => member.active).length;
        return <li key={league.id}><button type="button" className={league.id === selectedLeague?.id ? 'picker-item picker-item-active' : 'picker-item'} onClick={() => selectLeague(league)}><strong>{league.hierarchyPosition ?? '?'} {league.name}</strong><span>{league.status} · {activeCount}/{league.maxPlayers} active · {league.matchesPerPair}× pair · P{league.promotionPlaces ?? 0}/R{league.relegationPlaces ?? 0}</span></button></li>;
      })}</ul> : <p className="empty-message">Loading league summaries…</p>}</div>
      {leagueEdit && <form className="admin-block stack-form" onSubmit={saveLeague}><div className="section-heading"><h3>Edit {leagueEdit.name}</h3><span className="count-label">#{leagueEdit.hierarchyPosition ?? 1}</span></div><label>League name<input value={leagueEdit.name} onChange={(e) => setLeagueEdit({ ...leagueEdit, name: e.target.value })} /></label><div className="form-grid"><label>Hierarchy position<input type="number" min="1" value={leagueEdit.hierarchyPosition ?? 1} onChange={(e) => setLeagueEdit({ ...leagueEdit, hierarchyPosition: Number(e.target.value) })} /></label><label>Max players<input type="number" min="2" value={leagueEdit.maxPlayers} onChange={(e) => setLeagueEdit({ ...leagueEdit, maxPlayers: Number(e.target.value) })} /></label><label>Matches per pair<input type="number" min="1" value={leagueEdit.matchesPerPair} onChange={(e) => setLeagueEdit({ ...leagueEdit, matchesPerPair: Number(e.target.value) })} /></label><div className="rules-panel"><h4>Match & table rules</h4><p className="form-help">{describeMatchFormat(leagueEdit.maxLegs)}</p><div className="form-grid"><label>Best of<input type="number" min="1" max="40" value={leagueEdit.maxLegs} onChange={(e) => setLeagueEdit({ ...leagueEdit, maxLegs: Number(e.target.value) })} /></label><label>Points for win<input type="number" min="0" max="100" value={leagueEdit.pointsPerWin} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerWin: Number(e.target.value) })} /></label><label>Points for draw<input type="number" min="0" max="100" value={leagueEdit.pointsPerDraw} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerDraw: Number(e.target.value) })} /></label><label>Points for loss<input type="number" min="0" max="100" value={leagueEdit.pointsPerLoss} onChange={(e) => setLeagueEdit({ ...leagueEdit, pointsPerLoss: Number(e.target.value) })} /></label></div></div><label>Promotion places<input type="number" min="0" value={leagueEdit.promotionPlaces ?? 0} onChange={(e) => setLeagueEdit({ ...leagueEdit, promotionPlaces: Number(e.target.value) })} /></label><label>Relegation places<input type="number" min="0" value={leagueEdit.relegationPlaces ?? 0} onChange={(e) => setLeagueEdit({ ...leagueEdit, relegationPlaces: Number(e.target.value) })} /></label></div><label>Visibility<select value={leagueEdit.visibility} onChange={(e) => setLeagueEdit({ ...leagueEdit, visibility: e.target.value as 'PUBLIC' | 'PRIVATE' })}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label><button className="primary-button" type="submit">Save league</button></form>}
      <details className="admin-disclosure"><summary>Add or remove league</summary><div className="admin-disclosure-body">
        <form className="admin-block stack-form" onSubmit={createLeague}><h3>Add league</h3><label>New league name<input value={newLeagueName} onChange={(e) => setNewLeagueName(e.target.value)} required /></label><label>New hierarchy position<input type="number" min="1" value={newHierarchy} onChange={(e) => setNewHierarchy(e.target.value)} required /></label><label>New visibility<select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label><button className="primary-button" type="submit">Create league</button></form>
        {leagueEdit && <button className="secondary-button" type="button" onClick={() => setConfirm({ title: `Delete ${leagueEdit.name}?`, message: 'Only an empty league can be removed. The server protects competition history.', action: async () => { await api.deleteCompetitionLeague(leagueEdit.id); setLeagues((current) => current.filter((league) => league.id !== leagueEdit.id)); setMessage('Empty league deleted.'); } })}>Delete empty league</button>}
      </div></details>
    </div>

    <div role="tabpanel" hidden={task !== 'members'}>
      <div className="admin-block"><div className="section-heading"><h3>Unassigned players</h3><span className="count-label">{unassigned.length}</span></div><ul className="admin-list">{unassigned.map((player) => <li key={player.id}><div><strong>{player.username ?? 'Name pending'}</strong><small>{player.email}</small></div><div className="inline-actions"><select aria-label={`League for ${player.username}`} value={assignmentTargets[player.id] ?? ''} onChange={(e) => setAssignmentTargets((current) => ({ ...current, [player.id]: e.target.value }))}>{orderedLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select><button className="action-button" type="button" onClick={() => void assignPlayer(player)}>Assign {player.username}</button></div></li>)}</ul>{unassigned.length === 0 && <p className="empty-message">Every active club player has a league placement.</p>}</div>
      <div className="admin-block"><div className="section-heading"><h3>Season rosters</h3><span className="count-label">{Object.values(membersByLeague).flat().filter((member) => member.active).length}</span></div>{orderedLeagues.map((league) => <div className="roster-group" key={league.id}><h4>{league.name} · {(membersByLeague[league.id] ?? []).filter((member) => member.active).length}/{league.maxPlayers}</h4><ul className="admin-list">{(membersByLeague[league.id] ?? []).map((member) => <li key={member.userId}><div><strong>{member.username ?? 'Name pending'}</strong><small>{member.active ? 'Active' : 'Inactive'}</small></div><div className="inline-actions"><select aria-label={`Move ${member.username}`} value={moveTargets[member.userId] ?? league.id} onChange={(e) => setMoveTargets((current) => ({ ...current, [member.userId]: e.target.value }))}>{orderedLeagues.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select><button className="action-button" type="button" disabled={!member.active || (moveTargets[member.userId] ?? league.id) === league.id} onClick={() => void moveMember(member)}>Move {member.username}</button><button className="action-button" type="button" onClick={() => void setMemberActive(member, !member.active)}>{member.active ? `Deactivate ${member.username}` : `Reactivate ${member.username}`}</button></div></li>)}</ul></div>)}</div>
      {selectedSeason && <div className="admin-block stack-form"><h3>Draft starting placements</h3><p className="form-help">Copy this season's reviewed league placements into a draft season, then adjust promotions or overrides before opening.</p><label>Draft season for baseline placements<select value={baselineSeasonId} onChange={(e) => setBaselineSeasonId(e.target.value)}><option value="">Choose draft season</option>{seasons.filter((season) => season.id !== selectedSeason.id && season.status === 'DRAFT').map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label><button className="secondary-button" type="button" disabled={!baselineSeasonId} onClick={copyBaseline}>Copy current placements to draft</button></div>}
      {memberLeague && <div className="admin-block"><div className="section-heading"><h3>{memberLeague.name} invites</h3><span className="count-label">{invites.filter((invite) => !invite.revokedAt).length} active</span></div><button className="primary-button" type="button" onClick={() => void createInvite()}>Create invite for {memberLeague.name}</button>{inviteUrl && <div className="stack-form"><label>Latest invite<input value={inviteUrl} readOnly /></label><button className="secondary-button" type="button" onClick={() => void copyInvite()}>Copy invite link</button></div>}<ul className="admin-list">{invites.map((invite) => <li key={invite.id}><div><strong>{invite.revokedAt ? 'Revoked invite' : 'Active invite'}</strong><small>{invite.uses} uses · {formatExpiry(invite.expiresAt)}</small></div>{!invite.revokedAt && <button className="action-button" type="button" onClick={() => setConfirm({ title: 'Revoke invite?', message: 'The link will stop admitting new players; existing memberships remain.', action: async () => { await api.revokeInvite(invite.id); setInvites((current) => current.map((row) => row.id === invite.id ? { ...row, revokedAt: new Date().toISOString() } : row)); setMessage('Invite revoked.'); } })}>Revoke</button>}</li>)}</ul></div>}
    </div>

    <div role="tabpanel" hidden={task !== 'fixtures'}>{selectedLeague && <><div className="admin-block"><div className="section-heading"><h3>{selectedLeague.name} fixture health</h3><span className="count-label">{fixtures.length} total</span></div><div className="fixture-health"><button className="action-button" type="button" onClick={() => setFixtureFilter('OUTSTANDING')}>Outstanding {fixtureCounts.outstanding}</button><button className="action-button" type="button" onClick={() => setFixtureFilter('PENDING_CONFIRMATION')}>Pending {fixtureCounts.pending}</button><button className="action-button" type="button" onClick={() => setFixtureFilter('DISPUTED')}>Disputed {fixtureCounts.disputed}</button><button className="action-button" type="button" onClick={() => setFixtureFilter('CONFIRMED')}>Completed {fixtureCounts.completed}</button></div><div className="inline-actions"><button className="secondary-button" type="button" onClick={() => void previewFixtures()}>Preview fixtures</button><button className="primary-button" type="button" onClick={() => void commitFixtures()}>Commit fixtures</button><button className="secondary-button" type="button" onClick={() => setConfirm({ title: 'Reset unplayed fixtures?', message: 'The server refuses reset after protected play begins.', action: async () => { await api.resetFixtures(selectedLeague.id); setFixtures([]); setFixturePreview(null); setMessage('Unplayed fixtures reset.'); } })}>Reset before play</button></div></div>{fixturePreview && <div className="admin-block"><div className="section-heading"><h3>Preview</h3><span className="count-label">{fixturePreview.expectedFixtureCount} fixture{fixturePreview.expectedFixtureCount === 1 ? '' : 's'} expected</span></div><ul className="admin-list">{fixturePreview.fixtures.map((item) => <li key={`${item.playerAId}:${item.playerBId}:${item.meetingNumber}`}><div><strong>{memberName(item.playerAId)} vs {memberName(item.playerBId)}</strong><small>Round {item.round} · meeting {item.meetingNumber}</small></div></li>)}</ul></div>}<div className="admin-block"><ul className="admin-list">{visibleFixtures.map((item) => <li key={item.id}><div><strong>{item.playerAUsername ?? memberName(item.playerAId)} vs {item.playerBUsername ?? memberName(item.playerBId)}</strong><small>Round {item.round} · meeting {item.meetingNumber} · {fixtureLabel(item.status)}</small></div>{(item.status === 'OUTSTANDING' || item.status === 'VOID') && <button className="action-button" type="button" onClick={() => void voidFixture(item)}>{item.status === 'VOID' ? `Restore ${item.playerAUsername} vs ${item.playerBUsername}` : `Void ${item.playerAUsername} vs ${item.playerBUsername}`}</button>}</li>)}</ul></div></>}</div>

    <div role="tabpanel" hidden={task !== 'results'}>{selectedLeague && <AdminResultsWorkflow leagueId={selectedLeague.id} />}</div>

    <div role="tabpanel" hidden={task !== 'promotion'}><div className="admin-block"><div className="section-heading"><h3>Promotion & relegation</h3>{promotion && <span className="status-label">{promotion.provisional ? 'Provisional' : 'Final eligible'}</span>}</div><ul className="admin-list">{promotion?.movements.map((movement) => <li key={movement.userId}><div><strong>{memberName(movement.userId)}</strong><small>{leagueName(movement.fromLeagueId)} → {leagueName(movement.toLeagueId)} · {movement.kind.toLowerCase()}</small></div></li>)}</ul></div><div className="admin-block stack-form"><label>Next season<select value={targetSeasonId} onChange={(e) => setTargetSeasonId(e.target.value)}><option value="">Choose draft season</option>{seasons.filter((season) => season.id !== selectedSeasonId && season.status === 'DRAFT').map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label><button className="primary-button" type="button" disabled={!targetSeasonId || promotion?.provisional === true} onClick={() => void createProposal()}>Create promotion proposal</button></div>{proposal.length > 0 && <div className="admin-block"><ul className="admin-list">{proposal.map((movement) => <li key={movement.userId}><div><strong>{memberName(movement.userId)}</strong><small>{leagueName(movement.fromLeagueId)} → {leagueName(movement.toLeagueId)}</small></div><div className="proposal-controls"><label>Override destination for {memberName(movement.userId)}<select value={overrideTargets[movement.userId] ?? movement.toLeagueId ?? ''} onChange={(e) => setOverrideTargets((current) => ({ ...current, [movement.userId]: e.target.value }))}>{targetLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label><label>Override reason for {memberName(movement.userId)}<input value={overrideReasons[movement.userId] ?? ''} onChange={(e) => setOverrideReasons((current) => ({ ...current, [movement.userId]: e.target.value }))} /></label><button className="action-button" type="button" onClick={() => void saveOverride(movement)}>Save override for {memberName(movement.userId)}</button></div></li>)}</ul><button className="primary-button" type="button" onClick={() => void applyProposal()}>Apply to next season</button></div>}</div>

    <div role="tabpanel" hidden={task !== 'access'}><div className="admin-block"><div className="section-heading"><h3>Club access</h3><span className="count-label">{players.length}</span></div><ul className="admin-list">{players.map((player) => <li key={player.id}><div><strong>{player.username ?? 'Name pending'}</strong><small>{player.email} · {player.role} · {player.status}</small>{player.isMasterAdmin && <small>Protected master administrator</small>}</div>{!player.isMasterAdmin && <div className="inline-actions">{player.role === 'PLAYER' ? <button className="action-button" type="button" onClick={() => void updatePlayer(player, { role: 'ADMIN' })}>Make {player.username} admin</button> : <button className="action-button" type="button" onClick={() => void updatePlayer(player, { role: 'PLAYER' })}>Remove {player.username} admin</button>}{player.status === 'ACTIVE' ? <button className="action-button" type="button" onClick={() => void updatePlayer(player, { status: 'SUSPENDED' })}>Suspend {player.username}</button> : <button className="action-button" type="button" onClick={() => void updatePlayer(player, { status: 'ACTIVE' })}>Reactivate {player.username}</button>}</div>}</li>)}</ul></div></div>

    {confirm && <div className="dialog-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="competition-confirm-title" className="confirm-dialog"><h3 id="competition-confirm-title">{confirm.title}</h3><p>{confirm.message}</p><div className="inline-actions"><button className="secondary-button" type="button" onClick={() => setConfirm(null)}>Cancel</button><button className="primary-button" type="button" onClick={() => { const current = confirm; setConfirm(null); void current.action().catch((cause) => setError(describeError(cause, 'Action could not be completed.'))); }}>Confirm</button></div></div></div>}
  </section>;
}
