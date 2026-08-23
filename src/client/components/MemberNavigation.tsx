import { AppIcon, type AppIconName } from './AppIcons';

export type MemberDestination = 'home' | 'record' | 'leagues' | 'more';

const destinations: Array<{ id: MemberDestination; label: string; icon: AppIconName }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'record', label: 'Record', icon: 'record' },
  { id: 'leagues', label: 'Leagues', icon: 'league' },
  { id: 'more', label: 'More', icon: 'more' },
];

export function MemberNavigation({ active, onSelect }: {
  active: MemberDestination;
  onSelect: (destination: MemberDestination) => void;
}) {
  return (
    <nav className="member-app-nav club-member-nav" aria-label="Member workspace">
      {destinations.map((destination) => (
        <button
          key={destination.id}
          type="button"
          className={active === destination.id ? 'member-app-nav-item member-app-nav-active' : 'member-app-nav-item'}
          aria-current={active === destination.id ? 'page' : undefined}
          onClick={() => onSelect(destination.id)}
        >
          <AppIcon name={destination.icon} />
          <span>{destination.label}</span>
        </button>
      ))}
    </nav>
  );
}
