import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  type ResultSummary,
  type SeasonSummary,
  type UnassignedPlayer,
  type UserSummary,
} from '../api';

const api = new ApiClient();

type AdminTask = 'season' | 'leagues' | 'members' | 'fixtures' | 'results' | 'promotion' | 'access';

const adminTasks: Array<{ key: AdminTask; label: string; panelId: string }> = [
  { key: 'season', label: 'Season', panelId: 'competition-season-panel' },
  { key: 'leagues', label: 'Leagues', panelId: 'competition-leagues-panel' },
  { key: 'members', label: 'Members & invites', panelId: 'competition-members-panel' },
  { key: 'fixtures', label: 'Fixtures', panelId: 'competition-fixtures-panel' },
  { key: 'results', label: 'Results', panelId: 'competition-results-panel' },
  { key: 'promotion', label: 'Promotion', panelId: 'competition-promotion-panel' },
  { key: 'access', label: 'Club access', panelId: 'competition-access-panel' },
];

interface AdminCompetitionDeskProps {
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

interface ResultDraft {
  playerAId: string;
  playerBId: string;
  playerALegs: string;
  playerBLegs: string;
  playerAAverage: string;
  playerBAverage: string;
}

const emptyResultDraft: ResultDraft = {
  playerAId: '', playerBId: '', playerALegs: '', playerBLegs: '', playerAAverage: '', playerBAverage: '',
};

function leagueOrder(left: LeagueSummary, right: LeagueSummary): number {
  return (left.hierarchyPosition ?? 999) - (right.hierarchyPosition ?? 999) || left.name.localeCompare(right.name);
}

function leagueInput(league: LeagueSummary) {
  return {
    name: league.name,
    slug: league.slug,
    maxPlayers: league.maxPlayers,
    matchesPerPair: league.matchesPerPair,
    pointsPerWin: league.pointsPerWin,
    targetLegs: league.targetLegs,
    visibility: league.visibility,
    hierarchyPosition: league.hierarchyPosition ?? 1,
    promotionPlaces: league.promotionPlaces ?? 0,
    relegationPlaces: league.relegationPlaces ?? 0,
  };
}

function resultInput(result: ResultSummary) {
  return {
    playerAId: result.playerAId,
    playerBId: result.playerBId,
    playerALegs: result.playerALegs,
    playerBLegs: result.playerBLegs,
    playerAAverage: result.playerAAverage,
    playerBAverage: result.playerBAverage,
  };
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function fixtureStateLabel(status: FixtureStatus): string {
  if (status === 'PENDING_CONFIRMATION') return 'Pending';
  if (status === 'CONFIRMED') return 'Completed';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function AdminCompetitionDesk({ user, selectedLeagueId, onLeagueSelected, onLeagueCreated, onLeagueChanged }: AdminCompetitionDeskProps) {
  const [task, setTask] = useState<AdminTask>('season');
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [internalLeagueId, setInternalLeagueId] = useState('');
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedPlayer[]>([]);
  const [membersByLeague, setMembersByLeague] = useState<Record<string, CompetitionMember[]>>({});
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [fixturePreview, setFixturePreview] = useState<FixturePreview | null>(null);
  const [fixtureFilter, setFixtureFilter] = useState<'ALL' | FixtureStatus>('ALL');
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [promotion, setPromotion] = useState<PromotionProjection | null>(null);
  const [proposal, setProposal] = useState<PromotionMovement[]>([]);
  const [targetSeasonId, setTargetSeasonId] = useState('');
  const [targetLeagues, setTargetLeagues] = useState<LeagueSummary[]>([]);
  const [overrideTargets, setOverrideTargets] = useState<Record<string, string>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [seasonName, setSeasonName] = useState('');
  const [seasonStatus, setSeasonStatus] = useState<SeasonSummary['status']>('DRAFT');
  const [seasonCurrent, setSeasonCurrent] = useState(false);
  const [selectedLeagueEdit, setSelectedLeagueEdit] = useState<LeagueSummary | null>(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newHierarchy, setNewHierarchy] = useState('1');
  const [newMaxPlayers, setNewMaxPlayers] = useState('8');
  const [newRepeats, setNewRepeats] = useState('1');
  const [newTargetLegs, setNewTargetLegs] = useState('3');
  const [newPoints, setNewPoints] = useState('2');
  const [newPromotion, setNewPromotion] = useState('0');
  const [newRelegation, setNewRelegation] = useState('0');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({});
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [resultDraft, setResultDraft] = useState<ResultDraft>(emptyResultDraft);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState<ResultSummary | null>(null);
  const requestToken = useRef(0);

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) ?? null;
  const activeLeagueId = selectedLeagueId && leagues.some((league) => league.id === selectedLeagueId) ? selectedLeagueId : internalLeagueId;
  const selectedLeague = leagues.find((league) => league.id === activeLeagueId) ?? null;
  const orderedLeagues = useMemo(() => [...leagues].sort(leagueOrder), [leagues]);
  const activeMembers = selectedLeague ? (membersByLeague[selectedLeague.id] ?? []).filter((member) => member.active) : [];

  const clearFeedback = () => { setMessage(''); setError(''); };

  const loadCore = async () => {
    const token = ++requestToken.current;
    clearFeedback();
    try {
      const [seasonPayload, playerPayload] = await Promise.all([api.adminSeasons(), api.adminPlayers()]);
      if (token !== requestToken.current) return;
      setSeasons(seasonPayload.seasons);
      setPlayers(playerPayload.players);
      setSelectedSeasonId((current) => {
        if (current && seasonPayload.seasons.some((season) => season.id === current)) return current;
        return seasonPayload.seasons.find((season) => season.isCurrent)?.id ?? seasonPayload.seasons[0]?.id ?? '';
      });
      setTargetSeasonId((current) => current || seasonPayload.seasons.find((season) => season.status === 'DRAFT' && !season.isCurrent)?.id || '');
    } catch (cause) {
      setError(errorMessage(cause, 'Competition administration could not be loaded.'));
    }
  };

  useEffect(() => { void loadCore(); }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    setSeasonName(selectedSeason.name);
    setSeasonStatus(selectedSeason.status);
    setSeasonCurrent(selectedSeason.isCurrent);
    let active = true;
    api.seasonLeagues(selectedSeason.id).then((payload) => {
      if (!active) return;
      const next = [...payload.leagues].sort(leagueOrder);
      setLeagues(next);
      const preferred = selectedLeagueId && next.some((league) => league.id === selectedLeagueId) ? selectedLeagueId : next[0]?.id ?? '';
      setInternalLeagueId(preferred ?? '');
      const picked = next.find((league) => league.id === preferred) ?? next[0] ?? null;
      setSelectedLeagueEdit(picked ? { ...picked } : null);
      onLeagueSelected?.(picked);
    }).catch((cause: unknown) => { if (active) setError(errorMessage(cause, 'League structure could not be loaded.')); });
    return () => { active = false; };
  }, [selectedSeason?.id]);

  useEffect(() => {
    if (!selectedLeague) return;
    setSelectedLeagueEdit({ ...selectedLeague });
    onLeagueSelected?.(selectedLeague);
  }, [selectedLeague?.id]);

  const getLeaguesForSeason = async (seasonId: string): Promise<LeagueSummary[]> => {
    if (leagues.length > 0) return [...leagues].sort(leagueOrder);
    try {
      const payload = await api.seasonLeagues(seasonId);
      const sorted = [...payload.leagues].sort(leagueOrder);
      setLeagues(sorted);
      return sorted;
    } catch {
      return [];
    }
  };

  const loadRoster = async () => {
    if (!selectedSeason) return;
    try {
      const currentLeagues = await getLeaguesForSeason(selectedSeason.id);
      const [unassignedPayload, ...memberPayloads] = await Promise.all([
        api.seasonUnassigned(selectedSeason.id),
        ...currentLeagues.map((league) => api.competitionMembers(league.id)),
      ]);
      setUnassigned(unassignedPayload.users);
      const next: Record<string, CompetitionMember[]> = {};
      currentLeagues.forEach((league, index) => { next[league.id] = memberPayloads[index]?.members ?? []; });
      setMembersByLeague((current) => ({ ...current, ...next }));
      setAssignmentTargets((current) => {
        const copy = { ...current };
        for (const player of unassignedPayload.users) copy[player.id] ||= selectedLeague?.id ?? currentLeagues[0]?.id ?? '';
        return copy;
      });
      setMoveTargets((current) => {
        const copy = { ...current };
        for (const league of currentLeagues) for (const member of next[league.id] ?? []) copy[member.userId] ||= league.id;
        return copy;
      });
    } catch (cause) {
      setError(errorMessage(cause, 'Season membership could not be loaded.'));
    }
  };

  const loadInvites = async () => {
    if (!selectedLeague) { setInvites([]); return; }
    try { setInvites((await api.adminInvites(selectedLeague.id)).invites); }
    catch (cause) { setError(errorMessage(cause, 'Invites could not be loaded.')); }
  };

  const loadFixtures = async () => {
    if (!selectedLeague) { setFixtures([]); return; }
    try { setFixtures((await api.fixtures(selectedLeague.id)).fixtures); }
    catch (cause) { setError(errorMessage(cause, 'Fixtures could not be loaded.')); }
  };

  const loadResults = async () => {
    if (!selectedLeague) { setResults([]); return; }
    try {
      const [resultPayload, memberPayload] = await Promise.all([api.adminResults(selectedLeague.id), api.competitionMembers(selectedLeague.id)]);
      setResults(resultPayload.results);
      setMembersByLeague((current) => ({ ...current, [selectedLeague.id]: memberPayload.members }));
    } catch (cause) { setError(errorMessage(cause, 'Results could not be loaded.')); }
  };

  const loadPromotion = async () => {
    if (!selectedSeason) { setPromotion(null); return; }
    try {
      const currentLeagues = await getLeaguesForSeason(selectedSeason.id);
      const [previewPayload, ...memberPayloads] = await Promise.all([
        api.promotionPreview(selectedSeason.id),
        ...currentLeagues.map((league) => api.competitionMembers(league.id)),
      ]);
      setPromotion(previewPayload.preview);
      setMembersByLeague((current) => {
        const next = { ...current };
        currentLeagues.forEach((league, index) => { next[league.id] = memberPayloads[index]?.members ?? next[league.id] ?? []; });
        return next;
      });
    } catch (cause) { setError(errorMessage(cause, 'Promotion projection could not be loaded.')); }
  };

  const loadPlayers = async () => {
    try {
      const payload = await api.adminPlayers();
      setPlayers(payload.players);
    } catch (cause) {
      setError(errorMessage(cause, 'Club access could not be loaded.'));
    }
  };

  useEffect(() => {
    clearFeedback();
    if (task === 'members') { void loadRoster(); void loadInvites(); }
    if (task === 'fixtures') void loadFixtures();
    if (task === 'results') void loadResults();
    if (task === 'promotion') void loadPromotion();
    if (task === 'access') void loadPlayers();
  }, [task, selectedLeague?.id, selectedSeason?.id, leagues.length]);

  useEffect(() => {
    if (task !== 'promotion' || !targetSeasonId) return;
    let active = true;
    api.seasonLeagues(targetSeasonId).then((payload) => { if (active) setTargetLeagues([...payload.leagues].sort(leagueOrder)); })
      .catch((cause: unknown) => { if (active) setError(errorMessage(cause, 'Next-season leagues could not be loaded.')); });
    return () => { active = false; };
  }, [task, targetSeasonId]);

  const selectTask = (next: AdminTask) => setTask(next);
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % adminTasks.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + adminTasks.length) % adminTasks.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = adminTasks.length - 1;
    else return;
    event.preventDefault();
    selectTask(adminTasks[next].key);
    document.getElementById(`competition-admin-tab-${adminTasks[next].key}`)?.focus();
  };

  const createSeason = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setBusy('create-season');
    try {
      const payload = await api.createAdminSeason({ name: newSeasonName, status: 'DRAFT', isCurrent: false });
      setSeasons((current) => [...current, payload.season]);
      setNewSeasonName('');
      setMessage('Season created.');
    } catch (cause) { setError(errorMessage(cause, 'Season could not be created.')); }
    finally { setBusy(null); }
  };

  const saveSeason = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSeason) return;
    clearFeedback(); setBusy('save-season');
    try {
      const payload = await api.updateAdminSeason(selectedSeason.id, { name: seasonName, status: seasonStatus, isCurrent: seasonCurrent });
      setSeasons((current) => current.map((season) => season.id === payload.season.id ? payload.season : seasonCurrent ? { ...season, isCurrent: false } : season));
      setMessage('Season settings saved.');
    } catch (cause) { setError(errorMessage(cause, 'Season could not be updated.')); }
    finally { setBusy(null); }
  };

  const createLeague = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSeason) return;
    clearFeedback(); setBusy('create-league');
    try {
      const payload = await api.createSeasonLeague(selectedSeason.id, {
        name: newLeagueName,
        maxPlayers: Number(newMaxPlayers),
        matchesPerPair: Number(newRepeats),
        targetLegs: Number(newTargetLegs),
        pointsPerWin: Number(newPoints),
        hierarchyPosition: Number(newHierarchy),
        promotionPlaces: Number(newPromotion),
        relegationPlaces: Number(newRelegation),
        visibility: newVisibility,
      });
      const next = [...leagues, payload.league].sort(leagueOrder);
      setLeagues(next);
      setInternalLeagueId(payload.league.id);
      setSelectedLeagueEdit({ ...payload.league });
      onLeagueCreated?.(payload.league);
      setNewLeagueName('');
      setNewHierarchy(String(next.length + 1));
      setNewVisibility('PRIVATE');
      setMessage('League created.');
    } catch (cause) { setError(errorMessage(cause, 'League could not be created.')); }
    finally { setBusy(null); }
  };

  const saveLeague = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLeagueEdit) return;
    clearFeedback(); setBusy('save-league');
    try {
      const payload = await api.updateCompetitionLeague(selectedLeagueEdit.id, leagueInput(selectedLeagueEdit));
      setLeagues((current) => current.map((league) => league.id === payload.league.id ? payload.league : league).sort(leagueOrder));
      setSelectedLeagueEdit({ ...payload.league });
      onLeagueChanged?.(payload.league);
      setMessage('League settings saved.');
    } catch (cause) { setError(errorMessage(cause, 'League settings could not be saved.')); }
    finally { setBusy(null); }
  };

  const assignPlayer = async (player: UnassignedPlayer) => {
    if (!selectedSeason) return;
    const leagueId = assignmentTargets[player.id];
    if (!leagueId) return;
    clearFeedback(); setBusy(`assign-${player.id}`);
    try {
      await api.assignSeasonMember(selectedSeason.id, player.id, leagueId);
      await loadRoster();
      setMessage('Player assigned.');
    } catch (cause) { setError(errorMessage(cause, 'Player could not be assigned.')); }
    finally { setBusy(null); }
  };

  const moveMember = async (member: CompetitionMember) => {
    if (!selectedSeason) return;
    const target = moveTargets[member.userId];
    if (!target || target === member.leagueId) return;
    clearFeedback(); setBusy(`move-${member.userId}`);
    try {
      await api.moveSeasonMember(selectedSeason.id, member.userId, member.leagueId, target);
      await loadRoster();
      setMessage('Player moved.');
    } catch (cause) { setError(errorMessage(cause, 'Player could not be moved.')); }
    finally { setBusy(null); }
  };

  const createInvite = async () => {
    if (!selectedLeague) return;
    clearFeedback(); setBusy('create-invite');
    try {
      const payload = await api.createInvite(selectedLeague.id);
      setInviteUrl(payload.invite.url);
      setInvites((current) => [{ id: payload.invite.id, leagueId: payload.invite.leagueId, expiresAt: payload.invite.expiresAt, uses: 0, revokedAt: null, createdAt: new Date().toISOString() }, ...current]);
      setMessage('Invite link ready.');
    } catch (cause) { setError(errorMessage(cause, 'Invite could not be created.')); }
    finally { setBusy(null); }
  };

  const previewFixtures = async () => {
    if (!selectedLeague) return;
    clearFeedback(); setBusy('preview-fixtures');
    try { setFixturePreview((await api.fixturePreview(selectedLeague.id)).preview); }
    catch (cause) { setError(errorMessage(cause, 'Fixture preview could not be generated.')); }
    finally { setBusy(null); }
  };

  const commitFixtures = async () => {
    if (!selectedLeague) return;
    clearFeedback(); setBusy('commit-fixtures');
    try {
      const payload = await api.commitFixtures(selectedLeague.id);
      setFixtures(payload.fixtures);
      setMessage('Fixtures committed.');
    } catch (cause) { setError(errorMessage(cause, 'Fixtures could not be committed.')); }
    finally { setBusy(null); }
  };

  const voidFixture = async (fixture: FixtureSummary) => {
    clearFeedback(); setBusy(`fixture-${fixture.id}`);
    try {
      const payload = await api.setFixtureStatus(fixture.id, fixture.status === 'VOID' ? 'OUTSTANDING' : 'VOID');
      setFixtures((current) => current.map((row) => row.id === fixture.id ? payload.fixture : row));
      setMessage(fixture.status === 'VOID' ? 'Fixture restored.' : 'Fixture voided.');
    } catch (cause) { setError(errorMessage(cause, 'Fixture could not be updated.')); }
    finally { setBusy(null); }
  };

  const createHistoricalResult = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLeague) return;
    clearFeedback(); setBusy('create-result');
    try {
      const payload = await api.createAdminResult(selectedLeague.id, {
        playerAId: resultDraft.playerAId,
        playerBId: resultDraft.playerBId,
        playerALegs: Number(resultDraft.playerALegs),
        playerBLegs: Number(resultDraft.playerBLegs),
        playerAAverage: Number(resultDraft.playerAAverage),
        playerBAverage: Number(resultDraft.playerBAverage),
      });
      setResults((current) => [payload.result, ...current]);
      setResultDraft(emptyResultDraft);
      setMessage('Confirmed result entered.');
    } catch (cause) { setError(errorMessage(cause, 'Result could not be entered.')); }
    finally { setBusy(null); }
  };

  const saveResult = async (result: ResultSummary) => {
    clearFeedback(); setBusy(`result-${result.id}`);
    try {
      const payload = await api.updateAdminResult(result.id, { ...resultInput(result), status: result.status, disputeNote: result.disputeNote });
      setResults((current) => current.map((row) => row.id === result.id ? payload.result : row));
      setEditingResultId(null); setEditingResult(null); setMessage('Result updated.');
    } catch (cause) { setError(errorMessage(cause, 'Result could not be updated.')); }
    finally { setBusy(null); }
  };

  const createProposal = async () => {
    if (!selectedSeason || !targetSeasonId) return;
    clearFeedback(); setBusy('proposal');
    try {
      const payload = await api.createPromotionProposal(selectedSeason.id, targetSeasonId);
      setProposal(payload.movements);
      setOverrideTargets(Object.fromEntries(payload.movements.map((movement) => [movement.userId, movement.toLeagueId ?? ''])));
      setMessage('Promotion proposal created.');
    } catch (cause) { setError(errorMessage(cause, 'Promotion proposal could not be created.')); }
    finally { setBusy(null); }
  };

  const saveOverride = async (movement: PromotionMovement) => {
    if (!selectedSeason) return;
    clearFeedback(); setBusy(`override-${movement.userId}`);
    try {
      const payload = await api.overridePromotionMovement(selectedSeason.id, movement.userId, overrideTargets[movement.userId] ?? '', overrideReasons[movement.userId] ?? '');
      setProposal((current) => current.map((row) => row.userId === movement.userId ? payload.movement : row));
      setMessage('Movement override saved.');
    } catch (cause) { setError(errorMessage(cause, 'Movement override could not be saved.')); }
    finally { setBusy(null); }
  };

  const applyProposal = async () => {
    if (!selectedSeason || !targetSeasonId) return;
    clearFeedback(); setBusy('apply-promotion');
    try {
      await api.applyPromotionProposal(selectedSeason.id, targetSeasonId);
      setMessage('Next-season placements applied.');
    } catch (cause) { setError(errorMessage(cause, 'Next-season placements could not be applied.')); }
    finally { setBusy(null); }
  };

  const updatePlayer = async (player: AdminPlayer, role?: AdminPlayer['role'], status?: AdminPlayer['status']) => {
    clearFeedback(); setBusy(`access-${player.id}`);
    try {
      const payload = await api.updateAdminPlayer(player.id, { ...(role ? { role } : {}), ...(status ? { status } : {}) });
      setPlayers((current) => current.map((row) => row.id === player.id ? payload.player : row));
      setMessage('Club access updated.');
    } catch (cause) { setError(errorMessage(cause, 'Club access could not be updated.')); }
    finally { setBusy(null); }
  };

  const memberName = (userId: string): string => {
    for (const members of Object.values(membersByLeague)) {
      const found = members.find((member) => member.userId === userId);
      if (found) return found.username ?? 'Name pending';
    }
    return players.find((player) => player.id === userId)?.username ?? userId;
  };
  const leagueName = (leagueId: string | null): string => leagues.find((league) => league.id === leagueId)?.name ?? targetLeagues.find((league) => league.id === leagueId)?.name ?? 'Unassigned';

  const fixtureCounts = {
    outstanding: fixtures.filter((fixture) => fixture.status === 'OUTSTANDING').length,
    pending: fixtures.filter((fixture) => fixture.status === 'PENDING_CONFIRMATION').length,
    disputed: fixtures.filter((fixture) => fixture.status === 'DISPUTED').length,
    completed: fixtures.filter((fixture) => fixture.status === 'CONFIRMED').length,
  };
  const visibleFixtures = fixtureFilter === 'ALL' ? fixtures : fixtures.filter((fixture) => fixture.status === fixtureFilter);

  return (
    <section className="admin-desk admin-competition-desk" aria-labelledby="competition-admin-title">
      <div className="workspace-heading">
        <div>
          <h2 id="competition-admin-title">Competition admin</h2>
          <p className="form-help">Season structure, weekly settlement and next-season movement in one place.</p>
        </div>
        <button className="refresh-button" type="button" onClick={() => void loadCore()} disabled={busy !== null}>Refresh</button>
      </div>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="admin-tabs" role="tablist" aria-label="Competition administration tasks">
        {adminTasks.map((item, index) => (
          <button
            key={item.key}
            id={`competition-admin-tab-${item.key}`}
            className={task === item.key ? 'content-tab content-tab-active' : 'content-tab'}
            role="tab"
            type="button"
            aria-selected={task === item.key}
            aria-controls={item.panelId}
            tabIndex={task === item.key ? 0 : -1}
            onClick={() => selectTask(item.key)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >{item.label}</button>
        ))}
      </div>

      <div id="competition-season-panel" role="tabpanel" aria-labelledby="competition-admin-tab-season" hidden={task !== 'season'}>
        <div className="admin-block">
          <div className="section-heading"><h3>Seasons</h3><span className="count-label">{seasons.length}</span></div>
          <div className="competition-choice-list" role="list" aria-label="Club seasons">
            {seasons.map((season) => (
              <button key={season.id} type="button" className={season.id === selectedSeasonId ? 'picker-item picker-item-active' : 'picker-item'} onClick={() => setSelectedSeasonId(season.id)}>
                <strong>{season.name}</strong><span>{season.status}{season.isCurrent ? ' · Current' : ''}</span>
              </button>
            ))}
          </div>
        </div>
        {selectedSeason && <form className="admin-block stack-form" onSubmit={saveSeason}>
          <div className="section-heading"><h3>Season settings</h3>{selectedSeason.isCurrent && <span className="status-label status-open">Current</span>}</div>
          <label htmlFor="competition-season-name">Season name<input id="competition-season-name" value={seasonName} onChange={(event) => setSeasonName(event.target.value)} required /></label>
          <label htmlFor="competition-season-status">Season state<select id="competition-season-status" value={seasonStatus} onChange={(event) => setSeasonStatus(event.target.value as SeasonSummary['status'])}><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
          <label className="check-row" htmlFor="competition-season-current"><input id="competition-season-current" type="checkbox" checked={seasonCurrent} onChange={(event) => setSeasonCurrent(event.target.checked)} /> Current season</label>
          <button className="primary-button" type="submit" disabled={busy === 'save-season'}>Save season</button>
          {selectedSeason.status === 'DRAFT' && <button className="secondary-button" type="button" onClick={() => setConfirm({ title: 'Delete empty draft season?', message: 'Only an empty draft can be removed. Competition history is protected by the server.', action: async () => { await api.deleteAdminSeason(selectedSeason.id); setSeasons((current) => current.filter((season) => season.id !== selectedSeason.id)); setSelectedSeasonId(''); setMessage('Draft season deleted.'); } })}>Delete empty draft</button>}
        </form>}
        <form className="admin-block stack-form" onSubmit={createSeason}>
          <h3>Create season</h3>
          <label htmlFor="new-competition-season">New season name<input id="new-competition-season" value={newSeasonName} onChange={(event) => setNewSeasonName(event.target.value)} placeholder="2028/29" required /></label>
          <button className="primary-button" type="submit" disabled={busy === 'create-season'}>Create season</button>
        </form>
      </div>

      <div id="competition-leagues-panel" role="tabpanel" aria-labelledby="competition-admin-tab-leagues" hidden={task !== 'leagues'}>
        <div className="admin-block">
          <div className="section-heading"><h3>League structure</h3><span className="count-label">{orderedLeagues.length}</span></div>
          <ul className="competition-league-list" aria-label="Ordered league structure">
            {orderedLeagues.map((league) => <li key={league.id}><button type="button" className={league.id === selectedLeague?.id ? 'picker-item picker-item-active' : 'picker-item'} onClick={() => { setInternalLeagueId(league.id); setSelectedLeagueEdit({ ...league }); onLeagueSelected?.(league); }}><strong>{league.hierarchyPosition ?? '?'} {league.name}</strong><span>{league.maxPlayers} max · {league.matchesPerPair}× pair · P{league.promotionPlaces ?? 0}/R{league.relegationPlaces ?? 0}</span></button></li>)}
          </ul>
        </div>
        {selectedLeagueEdit && <form className="admin-block stack-form" onSubmit={saveLeague}>
          <div className="section-heading"><h3>Edit {selectedLeagueEdit.name}</h3><span className="count-label">#{selectedLeagueEdit.hierarchyPosition ?? 1}</span></div>
          <label htmlFor="league-edit-name">League name<input id="league-edit-name" value={selectedLeagueEdit.name} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, name: event.target.value })} required /></label>
          <div className="form-grid">
            <label htmlFor="league-edit-order">Hierarchy position<input id="league-edit-order" type="number" min="1" value={selectedLeagueEdit.hierarchyPosition ?? 1} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, hierarchyPosition: Number(event.target.value) })} /></label>
            <label htmlFor="league-edit-capacity">Max players<input id="league-edit-capacity" type="number" min="2" value={selectedLeagueEdit.maxPlayers} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, maxPlayers: Number(event.target.value) })} /></label>
            <label htmlFor="league-edit-repeats">Matches per pair<input id="league-edit-repeats" type="number" min="1" value={selectedLeagueEdit.matchesPerPair} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, matchesPerPair: Number(event.target.value) })} /></label>
            <label htmlFor="league-edit-legs">Legs to win<input id="league-edit-legs" type="number" min="1" value={selectedLeagueEdit.targetLegs} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, targetLegs: Number(event.target.value) })} /></label>
            <label htmlFor="league-edit-points">Points per win<input id="league-edit-points" type="number" min="1" value={selectedLeagueEdit.pointsPerWin} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, pointsPerWin: Number(event.target.value) })} /></label>
            <label htmlFor="league-edit-promotion">Promotion places<input id="league-edit-promotion" type="number" min="0" value={selectedLeagueEdit.promotionPlaces ?? 0} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, promotionPlaces: Number(event.target.value) })} /></label>
            <label htmlFor="league-edit-relegation">Relegation places<input id="league-edit-relegation" type="number" min="0" value={selectedLeagueEdit.relegationPlaces ?? 0} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, relegationPlaces: Number(event.target.value) })} /></label>
          </div>
          <label htmlFor="league-edit-visibility">Visibility<select id="league-edit-visibility" value={selectedLeagueEdit.visibility} onChange={(event) => setSelectedLeagueEdit({ ...selectedLeagueEdit, visibility: event.target.value as 'PUBLIC' | 'PRIVATE' })}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label>
          <button className="primary-button" type="submit" disabled={busy === 'save-league'}>Save league</button>
          <button className="secondary-button" type="button" onClick={() => setConfirm({ title: `Delete ${selectedLeagueEdit.name}?`, message: 'Only an empty league can be removed. The server will refuse any destructive history loss.', action: async () => { await api.deleteCompetitionLeague(selectedLeagueEdit.id); setLeagues((current) => current.filter((league) => league.id !== selectedLeagueEdit.id)); setMessage('Empty league deleted.'); } })}>Delete empty league</button>
        </form>}
        <form className="admin-block stack-form" onSubmit={createLeague}>
          <h3>Add league</h3>
          <label htmlFor="new-competition-league">New league name<input id="new-competition-league" value={newLeagueName} onChange={(event) => setNewLeagueName(event.target.value)} required /></label>
          <div className="form-grid">
            <label htmlFor="new-competition-order">New hierarchy position<input id="new-competition-order" type="number" min="1" value={newHierarchy} onChange={(event) => setNewHierarchy(event.target.value)} required /></label>
            <label htmlFor="new-competition-capacity">New max players<input id="new-competition-capacity" type="number" min="2" value={newMaxPlayers} onChange={(event) => setNewMaxPlayers(event.target.value)} required /></label>
            <label htmlFor="new-competition-repeats">New matches per pair<input id="new-competition-repeats" type="number" min="1" value={newRepeats} onChange={(event) => setNewRepeats(event.target.value)} required /></label>
            <label htmlFor="new-competition-legs">New legs to win<input id="new-competition-legs" type="number" min="1" value={newTargetLegs} onChange={(event) => setNewTargetLegs(event.target.value)} required /></label>
            <label htmlFor="new-competition-points">New points per win<input id="new-competition-points" type="number" min="1" value={newPoints} onChange={(event) => setNewPoints(event.target.value)} required /></label>
            <label htmlFor="new-competition-promotion">New promotion places<input id="new-competition-promotion" type="number" min="0" value={newPromotion} onChange={(event) => setNewPromotion(event.target.value)} /></label>
            <label htmlFor="new-competition-relegation">New relegation places<input id="new-competition-relegation" type="number" min="0" value={newRelegation} onChange={(event) => setNewRelegation(event.target.value)} /></label>
          </div>
          <label htmlFor="new-competition-visibility">New visibility<select id="new-competition-visibility" value={newVisibility} onChange={(event) => setNewVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label>
          <button className="primary-button" type="submit" disabled={busy === 'create-league'}>Create league</button>
        </form>
      </div>

      <div id="competition-members-panel" role="tabpanel" aria-labelledby="competition-admin-tab-members" hidden={task !== 'members'}>
        <div className="admin-block">
          <div className="section-heading"><h3>Unassigned players</h3><span className="count-label">{unassigned.length}</span></div>
          <ul className="admin-list">{unassigned.map((player) => <li key={player.id}><div><strong>{player.username ?? 'Name pending'}</strong><small>{player.email}</small></div><div className="inline-actions"><label className="sr-only" htmlFor={`assign-${player.id}`}>League for {player.username}</label><select id={`assign-${player.id}`} aria-label={`League for ${player.username}`} value={assignmentTargets[player.id] ?? ''} onChange={(event) => setAssignmentTargets((current) => ({ ...current, [player.id]: event.target.value }))}>{orderedLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select><button className="action-button" type="button" onClick={() => void assignPlayer(player)}>Assign {player.username}</button></div></li>)}</ul>
          {unassigned.length === 0 && <p className="empty-message">Every active club player has a league placement.</p>}
        </div>
        <div className="admin-block">
          <div className="section-heading"><h3>Season rosters</h3><span className="count-label">{Object.values(membersByLeague).flat().filter((member) => member.active).length}</span></div>
          {orderedLeagues.map((league) => <div className="roster-group" key={league.id}><h4>{league.name} · {(membersByLeague[league.id] ?? []).filter((member) => member.active).length}/{league.maxPlayers}</h4><ul className="admin-list">{(membersByLeague[league.id] ?? []).map((member) => <li key={member.userId}><div><strong>{member.username ?? 'Name pending'}</strong><small>{member.active ? 'Active' : 'Inactive'}</small></div><div className="inline-actions"><select aria-label={`Move ${member.username}`} value={moveTargets[member.userId] ?? league.id} onChange={(event) => setMoveTargets((current) => ({ ...current, [member.userId]: event.target.value }))}>{orderedLeagues.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select><button className="action-button" type="button" disabled={(moveTargets[member.userId] ?? league.id) === league.id} onClick={() => void moveMember(member)}>Move {member.username}</button></div></li>)}</ul></div>)}
        </div>
        {selectedLeague && <div className="admin-block">
          <div className="section-heading"><h3>{selectedLeague.name} invites</h3><span className="count-label">{invites.filter((invite) => !invite.revokedAt).length} active</span></div>
          <button className="primary-button" type="button" onClick={() => void createInvite()}>Create invite for {selectedLeague.name}</button>
          {inviteUrl && <label htmlFor="latest-invite">Latest invite<input id="latest-invite" value={inviteUrl} readOnly /></label>}
          <ul className="admin-list">{invites.map((invite) => <li key={invite.id}><div><strong>{invite.revokedAt ? 'Revoked invite' : 'Active invite'}</strong><small>{invite.uses} uses</small></div>{!invite.revokedAt && <button className="action-button" type="button" onClick={() => setConfirm({ title: 'Revoke invite?', message: 'The link will stop admitting new players; existing memberships remain.', action: async () => { await api.revokeInvite(invite.id); setInvites((current) => current.map((row) => row.id === invite.id ? { ...row, revokedAt: new Date().toISOString() } : row)); setMessage('Invite revoked.'); } })}>Revoke</button>}</li>)}</ul>
        </div>}
      </div>

      <div id="competition-fixtures-panel" role="tabpanel" aria-labelledby="competition-admin-tab-fixtures" hidden={task !== 'fixtures'}>
        {!selectedLeague ? <p className="empty-message">Create and select a league first.</p> : <>
          <div className="admin-block"><div className="section-heading"><div><h3>{selectedLeague.name} fixture health</h3><p className="form-help">Counts come from persisted fixture state.</p></div><span className="count-label">{fixtures.length} total</span></div><div className="fixture-health" role="group" aria-label="Fixture state filters"><button type="button" className="action-button" onClick={() => setFixtureFilter('OUTSTANDING')}>Outstanding {fixtureCounts.outstanding}</button><button type="button" className="action-button" onClick={() => setFixtureFilter('PENDING_CONFIRMATION')}>Pending {fixtureCounts.pending}</button><button type="button" className="action-button" onClick={() => setFixtureFilter('DISPUTED')}>Disputed {fixtureCounts.disputed}</button><button type="button" className="action-button" onClick={() => setFixtureFilter('CONFIRMED')}>Completed {fixtureCounts.completed}</button><button type="button" className="action-button" onClick={() => setFixtureFilter('ALL')}>All {fixtures.length}</button></div><div className="inline-actions"><button className="secondary-button" type="button" onClick={() => void previewFixtures()}>Preview fixtures</button><button className="primary-button compact-primary" type="button" onClick={() => void commitFixtures()}>Commit fixtures</button><button className="secondary-button" type="button" onClick={() => setConfirm({ title: 'Reset unplayed fixtures?', message: 'The server will refuse reset if protected result state exists.', action: async () => { await api.resetFixtures(selectedLeague.id); setFixtures([]); setFixturePreview(null); setMessage('Unplayed fixtures reset.'); } })}>Reset before play</button></div></div>
          {fixturePreview && <div className="admin-block"><div className="section-heading"><h3>Preview</h3><span className="count-label">{fixturePreview.expectedFixtureCount} fixture{fixturePreview.expectedFixtureCount === 1 ? '' : 's'} expected</span></div><ul className="admin-list">{fixturePreview.fixtures.map((item, index) => <li key={`${item.playerAId}:${item.playerBId}:${item.meetingNumber}`}><div><strong>{memberName(item.playerAId)} vs {memberName(item.playerBId)}</strong><small>Round {item.round} · meeting {item.meetingNumber}</small></div><span className="count-label">#{index + 1}</span></li>)}</ul></div>}
          <div className="admin-block"><div className="section-heading"><h3>Persisted fixtures</h3><span className="count-label">{visibleFixtures.length}</span></div><ul className="admin-list">{visibleFixtures.map((item) => <li key={item.id}><div><strong>{item.playerAUsername ?? memberName(item.playerAId)} vs {item.playerBUsername ?? memberName(item.playerBId)}</strong><small>Round {item.round} · meeting {item.meetingNumber} · {fixtureStateLabel(item.status)}</small></div>{(item.status === 'OUTSTANDING' || item.status === 'VOID') && <button className="action-button" type="button" onClick={() => void voidFixture(item)}>{item.status === 'VOID' ? `Restore ${item.playerAUsername} vs ${item.playerBUsername}` : `Void ${item.playerAUsername} vs ${item.playerBUsername}`}</button>}</li>)}</ul>{visibleFixtures.length === 0 && <p className="empty-message">No fixtures in this state.</p>}</div>
        </>}
      </div>

      <div id="competition-results-panel" role="tabpanel" aria-labelledby="competition-admin-tab-results" hidden={task !== 'results'}>
        {selectedLeague && <>
          <form className="admin-block stack-form" onSubmit={createHistoricalResult}><div className="section-heading"><h3>Record confirmed result</h3><span className="count-label">Admin correction</span></div><div className="form-grid"><label htmlFor="admin-result-a">Player A<select id="admin-result-a" value={resultDraft.playerAId} onChange={(event) => setResultDraft((current) => ({ ...current, playerAId: event.target.value }))}><option value="">Choose player</option>{activeMembers.map((member) => <option key={member.userId} value={member.userId}>{member.username}</option>)}</select></label><label htmlFor="admin-result-b">Player B<select id="admin-result-b" value={resultDraft.playerBId} onChange={(event) => setResultDraft((current) => ({ ...current, playerBId: event.target.value }))}><option value="">Choose player</option>{activeMembers.filter((member) => member.userId !== resultDraft.playerAId).map((member) => <option key={member.userId} value={member.userId}>{member.username}</option>)}</select></label><label htmlFor="admin-result-a-legs">Player A legs<input id="admin-result-a-legs" type="number" min="0" value={resultDraft.playerALegs} onChange={(event) => setResultDraft((current) => ({ ...current, playerALegs: event.target.value }))} /></label><label htmlFor="admin-result-b-legs">Player B legs<input id="admin-result-b-legs" type="number" min="0" value={resultDraft.playerBLegs} onChange={(event) => setResultDraft((current) => ({ ...current, playerBLegs: event.target.value }))} /></label><label htmlFor="admin-result-a-avg">Player A average<input id="admin-result-a-avg" type="number" step="0.01" value={resultDraft.playerAAverage} onChange={(event) => setResultDraft((current) => ({ ...current, playerAAverage: event.target.value }))} /></label><label htmlFor="admin-result-b-avg">Player B average<input id="admin-result-b-avg" type="number" step="0.01" value={resultDraft.playerBAverage} onChange={(event) => setResultDraft((current) => ({ ...current, playerBAverage: event.target.value }))} /></label></div><button className="primary-button" type="submit">Record result</button></form>
          <div className="admin-block"><div className="section-heading"><h3>Result queue</h3><span className="count-label">{results.length}</span></div><ul className="admin-list">{results.map((item) => <li key={item.id} className="result-admin-row"><div><strong>{item.playerAUsername} {item.playerALegs} - {item.playerBLegs} {item.playerBUsername}</strong><small>{item.status} · {item.playerAAverage.toFixed(2)} / {item.playerBAverage.toFixed(2)} avg</small></div><div className="inline-actions"><button className="action-button" type="button" onClick={() => { setEditingResultId(item.id); setEditingResult({ ...item }); }}>Edit result</button><button className="action-button" type="button" onClick={() => setConfirm({ title: 'Delete result?', message: 'This removes the active result while preserving the fixture for correction.', action: async () => { await api.deleteAdminResult(item.id); setResults((current) => current.filter((row) => row.id !== item.id)); setMessage('Result deleted.'); } })}>Delete</button></div>{editingResultId === item.id && editingResult && <div className="inline-editor"><label htmlFor={`result-status-${item.id}`}>Result state<select id={`result-status-${item.id}`} value={editingResult.status} onChange={(event) => setEditingResult({ ...editingResult, status: event.target.value as ResultSummary['status'] })}><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="DISPUTED">Disputed</option></select></label><button className="primary-button compact-primary" type="button" onClick={() => void saveResult(editingResult)}>Save result</button></div>}</li>)}</ul></div>
        </>}
      </div>

      <div id="competition-promotion-panel" role="tabpanel" aria-labelledby="competition-admin-tab-promotion" hidden={task !== 'promotion'}>
        <div className="admin-block"><div className="section-heading"><div><h3>Promotion & relegation</h3><p className="form-help">Projection follows the current table; final proposal requires a closed, resolved season.</p></div>{promotion && <span className={`status-label ${promotion.provisional ? 'status-pending' : 'status-confirmed'}`}>{promotion.provisional ? 'Provisional' : 'Final eligible'}</span>}</div>{promotion?.ambiguities.length ? <p className="error-message">{promotion.ambiguities.length} movement boundary tie{promotion.ambiguities.length === 1 ? '' : 's'} require resolution.</p> : null}<ul className="admin-list">{promotion?.movements.map((movement) => <li key={movement.userId}><div><strong>{memberName(movement.userId)}</strong><small>{leagueName(movement.fromLeagueId)} → {leagueName(movement.toLeagueId)} · {movement.kind.toLowerCase()}</small></div><span className="count-label">#{movement.fromPosition}</span></li>)}</ul>{promotion && promotion.movements.length === 0 && <p className="empty-message">No automatic movements at the current table.</p>}</div>
        <div className="admin-block stack-form"><label htmlFor="next-season">Next season<select id="next-season" value={targetSeasonId} onChange={(event) => setTargetSeasonId(event.target.value)}><option value="">Choose draft season</option>{seasons.filter((season) => season.id !== selectedSeasonId && season.status === 'DRAFT').map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label><button className="primary-button" type="button" disabled={!targetSeasonId || promotion?.provisional === true || busy === 'proposal'} onClick={() => void createProposal()}>Create promotion proposal</button></div>
        {proposal.length > 0 && <div className="admin-block"><div className="section-heading"><h3>Review proposed placements</h3><span className="count-label">{proposal.length}</span></div><ul className="admin-list proposal-list">{proposal.map((movement) => <li key={movement.userId}><div><strong>{memberName(movement.userId)}</strong><small>{leagueName(movement.fromLeagueId)} → {leagueName(movement.toLeagueId)}</small></div><div className="proposal-controls"><label htmlFor={`override-target-${movement.userId}`}>Override destination for {memberName(movement.userId)}<select id={`override-target-${movement.userId}`} value={overrideTargets[movement.userId] ?? movement.toLeagueId ?? ''} onChange={(event) => setOverrideTargets((current) => ({ ...current, [movement.userId]: event.target.value }))}>{targetLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label><label htmlFor={`override-reason-${movement.userId}`}>Override reason for {memberName(movement.userId)}<input id={`override-reason-${movement.userId}`} value={overrideReasons[movement.userId] ?? ''} onChange={(event) => setOverrideReasons((current) => ({ ...current, [movement.userId]: event.target.value }))} /></label><button className="action-button" type="button" onClick={() => void saveOverride(movement)}>Save override for {memberName(movement.userId)}</button></div></li>)}</ul><button className="primary-button" type="button" disabled={busy === 'apply-promotion'} onClick={() => void applyProposal()}>Apply to next season</button></div>}
      </div>

      <div id="competition-access-panel" role="tabpanel" aria-labelledby="competition-admin-tab-access" hidden={task !== 'access'}>
        <div className="admin-block"><div className="section-heading"><h3>Club access</h3><span className="count-label">{players.length}</span></div><ul className="admin-list">{players.map((player) => <li key={player.id}><div><strong>{player.username ?? 'Name pending'}</strong><small>{player.email} · {player.role} · {player.status}</small></div>{player.isMasterAdmin ? <span className="player-tag player-tag-admin">Protected master administrator</span> : player.id !== user.id && <div className="inline-actions"><button className="action-button" type="button" onClick={() => void updatePlayer(player, player.role === 'ADMIN' ? 'PLAYER' : 'ADMIN')}>{player.role === 'ADMIN' ? `Remove ${player.username} admin` : `Make ${player.username} admin`}</button><button className="action-button" type="button" onClick={() => void updatePlayer(player, undefined, player.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>{player.status === 'ACTIVE' ? `Suspend ${player.username}` : `Reactivate ${player.username}`}</button></div>}</li>)}</ul></div>
      </div>

      {confirm && <div className="modal-backdrop"><div className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="competition-confirm-title"><h3 id="competition-confirm-title">{confirm.title}</h3><p className="form-help">{confirm.message}</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setConfirm(null)}>Cancel</button><button className="primary-button" type="button" onClick={() => { const action = confirm.action; setConfirm(null); void action().catch((cause) => setError(errorMessage(cause, 'Action could not be completed.'))); }}>Confirm</button></div></div></div>}
    </section>
  );
}
