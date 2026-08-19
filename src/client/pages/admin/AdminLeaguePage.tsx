import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../../api/client';

export function AdminLeaguePage() {
  const [seasonName, setSeasonName] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [pointsPerWin, setPointsPerWin] = useState(2);
  const [targetLegs, setTargetLegs] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getAdminSummary().then(({ league }) => {
      setSeasonName(league.season_name);
      setStatus(league.status);
      setPointsPerWin(league.points_per_win);
      setTargetLegs(league.target_legs);
    }).catch((reason) => setError(reason instanceof ApiClientError ? reason.message : 'League settings could not be loaded.'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await api.updateAdminLeague({ seasonName, status, pointsPerWin, targetLegs });
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'League settings could not be saved.');
    }
  }

  return (
    <section className="admin-section">
      <h2>League</h2>
      <form className="panel form-stack" onSubmit={(event) => void submit(event)}>
        <label htmlFor="season-name">Season name</label><input id="season-name" value={seasonName} onChange={(event) => setSeasonName(event.target.value)} />
        <label htmlFor="league-status">Status</label><select id="league-status" value={status} onChange={(event) => setStatus(event.target.value as 'OPEN' | 'CLOSED')}><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select>
        <label htmlFor="points-per-win">Points per win</label><input id="points-per-win" type="number" min="0" value={pointsPerWin} onChange={(event) => setPointsPerWin(Number(event.target.value))} />
        <label htmlFor="target-legs">Target legs</label><input id="target-legs" type="number" min="1" value={targetLegs} onChange={(event) => setTargetLegs(Number(event.target.value))} />
        {error ? <p role="alert" className="form-error">{error}</p> : null}
        {saved ? <p role="status" className="success-panel">League saved.</p> : null}
        <button className="primary-button" type="submit">Save league</button>
      </form>
    </section>
  );
}
