import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicPlayerDto } from '../../shared/api';
import { api, ApiClientError } from '../api/client';

export function NewResultPage() {
  const [opponents, setOpponents] = useState<PublicPlayerDto[]>([]);
  const [opponentId, setOpponentId] = useState('');
  const [myLegs, setMyLegs] = useState('3');
  const [opponentLegs, setOpponentLegs] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.getOpponents()
      .then((response) => { if (active) setOpponents(response.opponents); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof ApiClientError ? reason.message : 'Opponents could not be loaded.'); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.submitResult({
        opponentId,
        myLegs: Number(myLegs),
        opponentLegs: Number(opponentLegs),
      });
      navigate('/my-results');
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : 'The result could not be submitted.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-card result-form-card">
        <p className="eyebrow">Match result</p>
        <h1>Add result</h1>
        <form onSubmit={submit}>
          <label htmlFor="opponent">Opponent</label>
          <select id="opponent" value={opponentId} onChange={(event) => setOpponentId(event.target.value)} required>
            <option value="">Choose opponent</option>
            {opponents.map((opponent) => <option value={opponent.id} key={opponent.id}>{opponent.username}</option>)}
          </select>

          <div className="score-inputs">
            <div>
              <label htmlFor="my-legs">My legs</label>
              <input id="my-legs" type="number" min="0" inputMode="numeric" value={myLegs} onChange={(event) => setMyLegs(event.target.value)} />
            </div>
            <span aria-hidden="true">-</span>
            <div>
              <label htmlFor="opponent-legs">Opponent legs</label>
              <input id="opponent-legs" type="number" min="0" inputMode="numeric" value={opponentLegs} onChange={(event) => setOpponentLegs(event.target.value)} />
            </div>
          </div>

          {error ? <p role="alert" className="field-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={saving || !opponentId}>
            {saving ? 'Submitting…' : 'Submit result'}
          </button>
        </form>
      </section>
    </main>
  );
}
