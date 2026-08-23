interface AppIconProps {
  name: 'share' | 'users' | 'calendar' | 'clock' | 'target' | 'rules' | 'lock' | 'league' | 'results' | 'more' | 'record' | 'players' | 'profile' | 'refresh' | 'settings' | 'logout';
  className?: string;
}

export function AppIcon({ name, className }: AppIconProps) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'share':
      return <svg {...common}><path d="M12 3v12"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M5 12v7h14v-7"/></svg>;
    case 'users':
      return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6"/><path d="M15 6.5a2.5 2.5 0 0 1 0 5"/><path d="M16.5 13.5c2.4.5 3.7 2.2 4 5"/></svg>;
    case 'calendar':
      return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>;
    case 'rules':
      return <svg {...common}><path d="M6 4h12M6 20h12M8 4c0 5-3 6-3 9h6c0-3-3-4-3-9ZM16 20c0-5-3-6-3-9h6c0 3-3 4-3 9Z"/></svg>;
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
    case 'league':
      return <svg {...common}><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/></svg>;
    case 'results':
      return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M20 12h-3M12 20v-3M4 12h3"/></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    case 'record':
      return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>;
    case 'players':
      return <svg {...common}><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3 19c.6-3.8 2.3-5.5 5-5.5s4.4 1.7 5 5.5M13.5 15c1-.9 2.1-1.3 3.2-1.3 2.3 0 3.7 1.7 4.1 5.3"/></svg>;
    case 'profile':
      return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-4.5 3-6.5 7-6.5s6.4 2 7 6.5"/></svg>;
    case 'refresh':
      return <svg {...common}><path d="M19 7v5h-5"/><path d="M18.2 12A7 7 0 1 0 17 17"/></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"/></svg>;
    case 'logout':
      return <svg {...common}><path d="M10 5H5v14h5"/><path d="M13 8l4 4-4 4M17 12H9"/></svg>;
  }
}
