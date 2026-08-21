import type { StandingRow } from '../api';

interface StandingsTableProps {
  standings: StandingRow[];
  label: string;
  highlightPlayerId?: string;
}

export function StandingsTable({ standings, label, highlightPlayerId }: StandingsTableProps) {
  return (
    <div className="standings-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="standings-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">Player</th>
            <th scope="col">P</th>
            <th scope="col">W-L</th>
            <th scope="col">Avg</th>
            <th scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr className={row.playerId === highlightPlayerId ? 'standing-row-you' : undefined} key={row.playerId}>
              <td>{row.rank}</td>
              <th scope="row">{row.username}</th>
              <td>{row.played}</td>
              <td>{row.won}-{row.lost}</td>
              <td>{row.average.toFixed(2)}</td>
              <td>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
