import { useEffect, useState } from 'react';
import type { PublicPlayerDto } from '../../shared/api';
import { api, ApiClientError } from '../api/client';

export function PlayersPage() {
  const [players, setPlayers] = useState<PublicPlayerDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicPlayers()
      .then((response) => setPlayers(response.players))
      .catch((reason: unknown) => setError(reason instanceof ApiClientError ? reason.message : 'Players are unavailable.'));
  }, []);

  return (
    <main className="page">
      <h1>Players</h1>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      {players === null && !error ? <p className="loading-state">Loading players…</p> : null}
      {players ? (
        <ul className="player-list">
          {players.map((player, index) => <li key={player.id}><span>{index + 1}</span><strong>{player.username}</strong></li>)}
        </ul>
      ) : null}
    </main>
  );
}
