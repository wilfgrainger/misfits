import type { StandingRow } from '../api';

interface StandingsTableProps {
  standings: StandingRow[];
  label: string;
  highlightPlayerId?: string;
  promotionPlaces?: number;
  relegationPlaces?: number;
  movementProvisional?: boolean;
}

export function StandingsTable({ standings, label, highlightPlayerId, promotionPlaces = 0, relegationPlaces = 0, movementProvisional = true }: StandingsTableProps) {
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
            const inPromotionZone = promotionPlaces > 0 && row.rank <= promotionPlaces;
            const inRelegationZone = relegationPlaces > 0 && row.rank > standings.length - relegationPlaces;
            const zoneLabel = inPromotionZone ? `Promotion zone${movementProvisional ? ' · provisional' : ''}` : inRelegationZone ? `Relegation zone${movementProvisional ? ' · provisional' : ''}` : null;
            return (
            <tr className={row.playerId === highlightPlayerId ? 'standing-row-you' : undefined} key={row.playerId}>
              <td className="standing-rank"><span>{row.rank}</span>{zoneLabel && <small className={inPromotionZone ? 'movement-zone movement-zone-promotion' : 'movement-zone movement-zone-relegation'}>{zoneLabel}</small>}</td>
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
