import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient, type LeagueDetail, type LeagueSummary, type ResultInput, type ResultSummary, type StandingRow, type UserSummary } from '../api';
import { ProfilePanel } from './ProfilePanel';
import { StandingsTable } from './StandingsTable';

const api = new ApiClient();
type PlayerView = 'table' | 'results' | 'players' | 'record' | 'profile';

interface PlayerLeagueProps {
  user: UserSummary;
  league: LeagueSummary;
  onUserSaved: (user: UserSummary) => void;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function ResultRow({ result, user, onResolve }: { result: ResultSummary; user: UserSummary; onResolve: (result: ResultSummary) => void }) {
  const isPlayerA = result.playerAId === user.id;
  const winner = result.playerALegs > result.playerBLegs ? result.playerAUsername : result.playerBUsername;
  return (
    <div className="result-row">
      <div className="result-main">
        <strong>{result.playerAUsername ?? 'Player'} <span>{result.playerALegs}</span></strong>
        <span className="result-divider">-</span>
        <strong>{result.playerBUsername ?? 'Player'} <span>{result.playerBLegs}</span></strong>
      </div>
      <div className="result-meta">
        <span>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</span>
        <span>{displayDate(result.createdAt)}</span>
      </div>
      {result.status !== 'CONFIRMED' && <span className={`status-label status-${result.status.toLowerCase()}`}>{result.status}</span>}
      {result.status === 'PENDING' && !isPlayerA && result.submittedBy !== user.id && <button className="action-button" type="button" onClick={() => onResolve(result)}>Review result</button>}
      {result.status === 'DISPUTED' && result.disputeNote && <p className="dispute-note">{result.disputeNote}</p>}
      {result.status === 'CONFIRMED' && winner && <span className="result-winner">Winner: {winner}</span>}
    </div>
  );
}

export function PlayerLeague({ user, league, onUserSaved }: PlayerLeagueProps) {
  const [view, setView] = useState<PlayerView>('table');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [myResults, setMyResults] = useState<ResultSummary[]>([]);
  const [detail, setDetail] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [playerALegs, setPlayerALegs] = useState(String(league.targetLegs));
  const [playerBLegs, setPlayerBLegs] = useState('0');
  const [playerAAverage, setPlayerAAverage] = useState('');
  const [playerBAverage, setPlayerBAverage] = useState('');
  const [busyResult, setBusyResult] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const loadRequest = useRef(0);
  const disputeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const disputeDialogRef = useRef<HTMLFormElement | null>(null);
  const disputeNoteRef = useRef<HTMLTextAreaElement | null>(null);
  const disputeWasOpen = useRef(false);

  const load = async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError('');
    try {
      const [standingPayload, resultPayload, detailPayload, mine] = await Promise.all([
        api.standings(league.id),
        api.results(league.id),
        api.publicLeague(league.id),
        api.myResults(),
      ]);
      if (request !== loadRequest.current) return;
      setStandings(standingPayload.standings);
      setResults(resultPayload.results);
      setDetail(detailPayload.league);
      setMyResults(mine.results.filter((result) => result.leagueId === league.id));
      setOpponentId((current) => current || detailPayload.players.find((player) => player.id !== user.id)?.id || '');
    } catch (cause) {
      if (request === loadRequest.current) setError(cause instanceof Error ? cause.message : 'League data could not be loaded.');
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [league.id]);

  const opponents = useMemo(() => detail?.players.filter((player) => player.id !== user.id) ?? [], [detail?.players, user.id]);
  const pending = myResults.filter((result) => result.status === 'PENDING' && result.submittedBy !== user.id);
  const canRecord = league.status === 'OPEN';

  useEffect(() => {
    setView('table');
    setOpponentId('');
    setPlayerALegs(String(league.targetLegs));
    setPlayerBLegs('0');
    setPlayerAAverage('');
    setPlayerBAverage('');
  }, [league.id, league.targetLegs]);

  useEffect(() => {
    if (disputeId) {
      disputeWasOpen.current = true;
      disputeNoteRef.current?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setDisputeId(null);
          setDisputeNote('');
          return;
        }
        if (event.key !== 'Tab') return;
        const controls = disputeDialogRef.current?.querySelectorAll<HTMLElement>('textarea, button:not([disabled])');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
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
    if (disputeWasOpen.current) {
      disputeWasOpen.current = false;
      disputeTriggerRef.current?.focus();
    }
  }, [disputeId]);

  const submitResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyResult('new');
    setError('');
    setNotice('');
    const input: ResultInput = { playerAId: user.id, playerBId: opponentId, playerALegs: Number(playerALegs), playerBLegs: Number(playerBLegs), playerAAverage: Number(playerAAverage), playerBAverage: Number(playerBAverage) };
    try {
      await api.submitResult(league.id, input);
      setNotice('Result sent to your opponent.');
      setView('results');
      setPlayerALegs(String(league.targetLegs));
      setPlayerBLegs('0');
      setPlayerAAverage('');
      setPlayerBAverage('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be recorded.');
    } finally {
      setBusyResult(null);
    }
  };

  const confirm = async (result: ResultSummary) => {
    setBusyResult(result.id);
    try { await api.confirmResult(result.id); setNotice('Result confirmed.'); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be confirmed.'); }
    finally { setBusyResult(null); }
  };

  const submitDispute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disputeId) return;
    setBusyResult(disputeId);
    try { await api.disputeResult(disputeId, disputeNote); setNotice('Result disputed for admin review.'); setDisputeId(null); setDisputeNote(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Result could not be disputed.'); }
    finally { setBusyResult(null); }
  };

  const saveUser = (profile: Pick<UserSummary, 'username' | 'profileImageUrl' | 'dartsCounterUrl'>) => onUserSaved({ ...user, ...profile });

  return (
    <section className="player-workspace" aria-labelledby="league-title">
      <div className="league-heading">
        <div>
          <p className="section-kicker">{league.seasonName} / {league.status}</p>
          <h2 id="league-title">{league.name}</h2>
        </div>
        <button className="refresh-button" type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Loading' : 'Refresh'}</button>
      </div>
      <nav className="content-tabs" aria-label="Member workspace">
        {([['table', 'Table'], ['results', 'Results'], ['players', 'Players'], ['record', 'Add result'], ['profile', 'Profile']] as const).map(([key, label]) => <button key={key} className={view === key ? 'content-tab content-tab-active' : 'content-tab'} type="button" aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}>{label}</button>)}
      </nav>
      {notice && <p className="success-message" role="status">{notice}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {loading && <p className="loading-message">Loading league data...</p>}

      {!loading && view === 'table' && (
        <>
          <StandingsTable standings={standings} label={`${league.name} ${league.seasonName} standings`} highlightPlayerId={user.id} />
          {standings.length === 0 && <p className="empty-message">No active players yet.</p>}
        </>
      )}

      {!loading && view === 'results' && (
        <div className="result-feed"><h3>Confirmed games</h3><ul className="result-list">{results.map((result) => <li key={result.id}><ResultRow result={result} user={user} onResolve={confirm} /></li>)}</ul><h3 className="subsection-title">Your pending games</h3><ul className="result-list">{pending.map((result) => <li className="review-row" key={result.id}><ResultRow result={result} user={user} onResolve={confirm} /><div className="review-actions"><button className="primary-button" type="button" disabled={busyResult === result.id} onClick={() => void confirm(result)}>{busyResult === result.id ? 'Saving' : 'Confirm'}</button><button className="secondary-button" type="button" onClick={(event) => { disputeTriggerRef.current = event.currentTarget; setDisputeId(result.id); }}>Dispute</button></div></li>)}{pending.length === 0 && <li className="empty-message">No pending games.</li>}</ul></div>
      )}

      {!loading && view === 'players' && <ul className="club-player-list">{detail?.players.map((player) => <li key={player.id}><div className="avatar">{player.profileImageUrl ? <img src={player.profileImageUrl} alt="" /> : (player.username ?? '?').slice(0, 1).toUpperCase()}</div><strong>{player.username ?? 'Name pending'}</strong>{player.id === user.id && <span className="you-label">You</span>}</li>)}</ul>}

      {view === 'record' && <form className="result-form" onSubmit={submitResult}><div className="form-heading"><p className="section-kicker">NEW GAME</p><h3>Record your result</h3></div>{!canRecord && <p className="empty-message">Result entry is unavailable while this league is closed.</p>}<label htmlFor="opponent">Opponent</label><select id="opponent" value={opponentId} onChange={(event) => setOpponentId(event.target.value)} required disabled={!canRecord}><option value="">Choose player</option>{opponents.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select><div className="form-grid"><label htmlFor="your-legs">Your legs<input id="your-legs" type="number" min="0" max={league.targetLegs} value={playerALegs} onChange={(event) => setPlayerALegs(event.target.value)} required disabled={!canRecord} /></label><label htmlFor="their-legs">Their legs<input id="their-legs" type="number" min="0" max={league.targetLegs} value={playerBLegs} onChange={(event) => setPlayerBLegs(event.target.value)} required disabled={!canRecord} /></label><label htmlFor="your-average">Your average<input id="your-average" type="number" min="0" max="200" step="0.01" value={playerAAverage} onChange={(event) => setPlayerAAverage(event.target.value)} required disabled={!canRecord} /></label><label htmlFor="their-average">Their average<input id="their-average" type="number" min="0" max="200" step="0.01" value={playerBAverage} onChange={(event) => setPlayerBAverage(event.target.value)} required disabled={!canRecord} /></label></div><button className="primary-button" type="submit" disabled={!canRecord || busyResult === 'new' || opponents.length === 0}>{!canRecord ? 'League closed' : busyResult === 'new' ? 'Sending' : 'Send for confirmation'}</button></form>}

      {view === 'profile' && <ProfilePanel user={user} onSaved={saveUser} />}

      {disputeId && <div className="modal-backdrop"><form ref={disputeDialogRef} className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="dispute-title" onSubmit={submitDispute}><h3 id="dispute-title">Dispute result</h3><label htmlFor="dispute-note">What needs checking?</label><textarea ref={disputeNoteRef} id="dispute-note" maxLength={240} value={disputeNote} onChange={(event) => setDisputeNote(event.target.value)} required /><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setDisputeId(null); setDisputeNote(''); }}>Cancel</button><button className="primary-button" type="submit" disabled={busyResult === disputeId}>Send dispute</button></div></form></div>}
    </section>
  );
}
