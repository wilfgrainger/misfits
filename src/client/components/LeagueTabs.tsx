import type { LeagueSummary } from '../api';

interface LeagueTabsProps {
  leagues: LeagueSummary[];
  selectedId: string | null;
  onSelect: (leagueId: string) => void;
}

export function LeagueTabs({ leagues, selectedId, onSelect }: LeagueTabsProps) {
  if (leagues.length === 0) return null;
  return (
    <nav className="league-tabs" aria-label="Leagues">
      {leagues.map((league) => (
        <button
          className={`league-tab ${league.id === selectedId ? 'league-tab-active' : ''}`}
          key={league.id}
          type="button"
          aria-current={league.id === selectedId ? 'page' : undefined}
          onClick={() => onSelect(league.id)}
        >
          <span>{league.name}</span>
          <small>{league.seasonName}</small>
        </button>
      ))}
    </nav>
  );
}
