import type { PublicResultDto } from '../../shared/api';

export function ResultList({ results, showStatus = false }: { results: PublicResultDto[]; showStatus?: boolean }) {
  if (results.length === 0) return <p className="empty-state">No confirmed results yet.</p>;

  return (
    <ol className="result-list">
      {results.map((result) => (
        <li key={result.id} className="result-row">
          <div className="result-player result-player-a">
            <span>{result.playerA.username}</span>
            <strong>{result.playerA.legs}</strong>
          </div>
          <span className="result-score" aria-label={`${result.playerA.legs} - ${result.playerB.legs}`}>
            {result.playerA.legs} - {result.playerB.legs}
          </span>
          <div className="result-player result-player-b">
            <strong>{result.playerB.legs}</strong>
            <span>{result.playerB.username}</span>
          </div>
          {showStatus ? <span className="result-status">Confirmed</span> : null}
        </li>
      ))}
    </ol>
  );
}
