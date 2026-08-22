import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiClient, type CompetitionMember, type FixtureSummary, type ResultSummary } from '../api';

const api = new ApiClient();

type Draft = {
  fixtureId: string;
  playerALegs: string;
  playerBLegs: string;
  playerAAverage: string;
  playerBAverage: string;
};

const emptyDraft: Draft = {
  fixtureId: '',
  playerALegs: '',
  playerBLegs: '',
  playerAAverage: '',
  playerBAverage: '',
};

interface Props {
  leagueId: string;
}

function displayName(result: ResultSummary, side: 'A' | 'B') {
  return side === 'A' ? result.playerAUsername ?? result.playerAId : result.playerBUsername ?? result.playerBId;
}

function ageLabel(createdAt: string) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 'age unknown';
  const elapsed = Math.max(0, Date.now() - created);
  const days = Math.floor(elapsed / 86_400_000);
  if (days >= 1) return `${days}d old`;
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours >= 1) return `${hours}h old`;
  return 'new';
}

function resultContext(result: ResultSummary, members: CompetitionMember[]) {
  const submitter = members.find((member) => member.userId === result.submittedBy)?.username ?? result.submittedBy;
  const opponent = result.submittedBy === result.playerAId ? displayName(result, 'B') : displayName(result, 'A');
  return `Fixture ${result.fixtureId ?? 'legacy'} · Submitted by ${submitter} · Opponent ${opponent} · ${ageLabel(result.createdAt)}`;
}

async function createFixtureAdminResult(leagueId: string, draft: Draft): Promise<ResultSummary> {
  const response = await fetch(`/api/admin/leagues/${encodeURIComponent(leagueId)}/results`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fixtureId: draft.fixtureId,
      playerALegs: Number(draft.playerALegs),
      playerBLegs: Number(draft.playerBLegs),
      playerAAverage: Number(draft.playerAAverage),
      playerBAverage: Number(draft.playerBAverage),
    }),
  });
  const payload = await response.json().catch(() => null) as { result?: ResultSummary; error?: { message?: string } } | null;
  if (!response.ok || !payload?.result) throw new Error(payload?.error?.message ?? 'Official result could not be recorded.');
  return payload.result;
}

export function AdminResultsWorkflow({ leagueId }: Props) {
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [members, setMembers] = useState<CompetitionMember[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<ResultSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResultSummary | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const outstanding = useMemo(() => fixtures.filter((fixture) => fixture.status === 'OUTSTANDING'), [fixtures]);
  const pending = useMemo(() => results.filter((result) => result.status === 'PENDING'), [results]);
  const disputed = useMemo(() => results.filter((result) => result.status === 'DISPUTED'), [results]);
  const confirmed = useMemo(() => results.filter((result) => result.status === 'CONFIRMED'), [results]);
  const selectedFixture = useMemo(() => outstanding.find((fixture) => fixture.id === draft.fixtureId) ?? null, [outstanding, draft.fixtureId]);
  const playerALabel = selectedFixture?.playerAUsername ?? selectedFixture?.playerAId ?? 'Player A';
  const playerBLabel = selectedFixture?.playerBUsername ?? selectedFixture?.playerBId ?? 'Player B';

  const load = async () => {
    setReady(false);
    setError('');
    try {
      const [fixturePayload, resultPayload, memberPayload] = await Promise.all([
        api.fixtures(leagueId),
        api.adminResults(leagueId),
        api.competitionMembers(leagueId),
      ]);
      setFixtures(fixturePayload.fixtures);
      setResults(resultPayload.results);
      setMembers(memberPayload.members);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Official result workspace could not be loaded.');
    } finally {
      setReady(true);
    }
  };

  useEffect(() => { void load(); }, [leagueId]);

  const record = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(''); setError('');
    try {
      const result = await createFixtureAdminResult(leagueId, draft);
      setResults((current) => [result, ...current]);
      setFixtures((current) => current.map((fixture) => fixture.id === draft.fixtureId ? { ...fixture, status: 'CONFIRMED', resultId: result.id } : fixture));
      setDraft(emptyDraft);
      setMessage('Official result recorded.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Official result could not be recorded.');
    }
  };

  const saveResult = async (result: ResultSummary, successMessage: string) => {
    setMessage(''); setError('');
    try {
      const payload = await api.updateAdminResult(result.id, {
        playerAId: result.playerAId,
        playerBId: result.playerBId,
        playerALegs: result.playerALegs,
        playerBLegs: result.playerBLegs,
        playerAAverage: result.playerAAverage,
        playerBAverage: result.playerBAverage,
        status: result.status,
        disputeNote: result.disputeNote,
      });
      setResults((current) => current.map((row) => row.id === result.id ? payload.result : row));
      setFixtures((current) => current.map((fixture) => fixture.resultId === result.id ? { ...fixture, status: payload.result.status === 'CONFIRMED' ? 'CONFIRMED' : payload.result.status === 'DISPUTED' ? 'DISPUTED' : 'PENDING_CONFIRMATION' } : fixture));
      setEditing(null);
      setMessage(successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be updated.');
    }
  };

  const confirmResult = async (result: ResultSummary) => {
    await saveResult({ ...result, status: 'CONFIRMED', disputeNote: null }, 'Result confirmed.');
  };

  const deleteResult = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setMessage(''); setError('');
    try {
      await api.deleteAdminResult(target.id);
      setResults((current) => current.filter((row) => row.id !== target.id));
      setFixtures((current) => current.map((fixture) => fixture.resultId === target.id ? { ...fixture, status: 'OUTSTANDING', resultId: null } : fixture));
      setMessage('Result deleted. Fixture restored to outstanding.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result could not be deleted.');
    }
  };

  const renderQueue = (title: string, queue: ResultSummary[]) => <section className="admin-block">
    <div className="section-heading"><h3>{title}</h3><span className="count-label">{queue.length}</span></div>
    {queue.length === 0 ? <p className="empty-message">Nothing in this queue.</p> : <ul className="admin-list">
      {queue.map((result) => <li key={result.id}>
        <div>
          <strong>{displayName(result, 'A')} vs {displayName(result, 'B')} · {result.playerALegs}–{result.playerBLegs}</strong>
          <small>{resultContext(result, members)}</small>
          <small>{result.playerAAverage.toFixed(2)} / {result.playerBAverage.toFixed(2)} avg</small>
          {result.disputeNote && <span className="dispute-note">{result.disputeNote}</span>}
        </div>
        <div className="inline-actions">
          {result.status !== 'CONFIRMED' && <button className="action-button" type="button" aria-label={`Confirm ${result.status === 'DISPUTED' ? 'disputed ' : ''}result ${displayName(result, 'A')} vs ${displayName(result, 'B')}`} onClick={() => void confirmResult(result)}>Confirm result</button>}
          <button className="action-button" type="button" aria-label={`Edit result ${displayName(result, 'A')} vs ${displayName(result, 'B')}`} onClick={() => setEditing({ ...result })}>Edit result</button>
          <button className="action-button" type="button" aria-label={`Delete result ${displayName(result, 'A')} vs ${displayName(result, 'B')}`} onClick={() => setDeleteTarget(result)}>Delete result</button>
        </div>
      </li>)}
    </ul>}
  </section>;

  if (!ready) return <p className="loading-message" role="status">Loading official results…</p>;

  return <div className="admin-results-workflow">
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}

    <form className="admin-block stack-form" onSubmit={record}>
      <div className="section-heading"><h3>Enter official fixture result</h3><span className="count-label">{outstanding.length} outstanding</span></div>
      <label>Outstanding fixture<select aria-label="Outstanding fixture" value={draft.fixtureId} onChange={(event) => setDraft((current) => ({ ...current, fixtureId: event.target.value }))} required><option value="">Choose fixture</option>{outstanding.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.playerAUsername ?? fixture.playerAId} vs {fixture.playerBUsername ?? fixture.playerBId}</option>)}</select></label>
      <div className="form-grid">
        <label>{playerALabel} legs<input aria-label={`${playerALabel} legs`} type="number" min="0" value={draft.playerALegs} onChange={(event) => setDraft((current) => ({ ...current, playerALegs: event.target.value }))} required /></label>
        <label>{playerBLabel} legs<input aria-label={`${playerBLabel} legs`} type="number" min="0" value={draft.playerBLegs} onChange={(event) => setDraft((current) => ({ ...current, playerBLegs: event.target.value }))} required /></label>
        <label>{playerALabel} average<input aria-label={`${playerALabel} average`} type="number" min="0" step="0.01" value={draft.playerAAverage} onChange={(event) => setDraft((current) => ({ ...current, playerAAverage: event.target.value }))} required /></label>
        <label>{playerBLabel} average<input aria-label={`${playerBLabel} average`} type="number" min="0" step="0.01" value={draft.playerBAverage} onChange={(event) => setDraft((current) => ({ ...current, playerBAverage: event.target.value }))} required /></label>
      </div>
      <button className="primary-button" type="submit" disabled={!draft.fixtureId}>Record official result</button>
    </form>

    {renderQueue('Pending confirmation', pending)}
    {renderQueue('Disputed results', disputed)}
    {renderQueue('Confirmed results', confirmed)}

    {editing && <div className="dialog-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="edit-result-title" className="confirm-dialog">
      <h3 id="edit-result-title">Correct result</h3>
      <div className="form-grid">
        <label>Edit player A legs<input aria-label="Edit player A legs" type="number" min="0" value={editing.playerALegs} onChange={(event) => setEditing({ ...editing, playerALegs: Number(event.target.value) })} /></label>
        <label>Edit player B legs<input aria-label="Edit player B legs" type="number" min="0" value={editing.playerBLegs} onChange={(event) => setEditing({ ...editing, playerBLegs: Number(event.target.value) })} /></label>
        <label>Edit player A average<input aria-label="Edit player A average" type="number" min="0" step="0.01" value={editing.playerAAverage} onChange={(event) => setEditing({ ...editing, playerAAverage: Number(event.target.value) })} /></label>
        <label>Edit player B average<input aria-label="Edit player B average" type="number" min="0" step="0.01" value={editing.playerBAverage} onChange={(event) => setEditing({ ...editing, playerBAverage: Number(event.target.value) })} /></label>
      </div>
      <div className="inline-actions"><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" type="button" onClick={() => void saveResult(editing, 'Result corrected.')}>Save corrected result</button></div>
    </div></div>}

    {deleteTarget && <div className="dialog-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="delete-result-title" className="confirm-dialog">
      <h3 id="delete-result-title">Delete result?</h3>
      <p>This removes the official result and restores its fixture for correction. The audit history remains intact.</p>
      <div className="inline-actions"><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="primary-button" type="button" onClick={() => void deleteResult()}>Confirm</button></div>
    </div></div>}
  </div>;
}
