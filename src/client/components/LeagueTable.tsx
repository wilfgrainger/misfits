import type { StandingRowDto } from '../api/client';

export function LeagueTable({ rows }: { rows: StandingRowDto[] }) {
  if (rows.length === 0) return <p className="empty-state">No league results yet. First throw is still waiting.</p>;

  return (
    <div className="table-scroll">
      <table className="league-table" aria-label="League table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">P</th>
            <th scope="col">W</th>
            <th scope="col">L</th>
            <th scope="col">+/-</th>
            <th scope="col">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.userId}>
              <td>{index + 1}</td>
              <th scope="row">{row.username}</th>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.lost}</td>
              <td>{row.legDifference > 0 ? `+${row.legDifference}` : row.legDifference}</td>
              <td><strong>{row.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
