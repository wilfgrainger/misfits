import type { StandingRow } from '../api';

interface StandingsTableProps {
  standings: StandingRow[];
  label: string;
  highlightPlayerId?: string;
  promotionPlaces?: number;
  relegationPlaces?: number;
}

export function StandingsTable({ standings, label, highlightPlayerId, promotionPlaces = 0, relegationPlaces = 0 }: StandingsTableProps) {
  return (
    <div className="standings-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="standings-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">Player</th>
            <th scope="col">P</th>
            <th scope="col">W-D-L</th>
            <th className="standing-cell-secondary" scope="col">Legs</th>
            <th className="standing-cell-secondary" scope="col">Avg</th>
            <th scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const movement = row.rank <= promotionPlaces && promotionPlaces > 0
              ? 'promotion'
              : row.rank > standings.length - relegationPlaces && relegationPlaces > 0
                ? 'relegation'
                : undefined;
            return (
            <tr className={[row.playerId === highlightPlayerId ? 'standing-row-you' : '', movement ? `standing-row-${movement}` : ''].filter(Boolean).join(' ') || undefined} key={row.playerId}>
              <td className="standing-rank">{row.rank}{movement && <span className="standing-movement-label">{movement === 'promotion' ? 'Promotion' : 'Relegation'}</span>}</td>
              <th className="standing-player" scope="row" aria-label={row.username}>
                <span className="standing-player-avatar" aria-hidden="true">{row.username.slice(0, 1).toUpperCase()}</span>
                <span className="standing-player-name">{row.username}</span>
              </th>
              <td>{row.played}</td>
              <td className="standing-record">{row.won}-{row.drawn}-{row.lost}</td>
              <td className="standing-cell-secondary">{row.legsFor}</td>
              <td className="standing-cell-secondary">{row.average.toFixed(2)}</td>
              <td className="standing-points">{row.points}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
