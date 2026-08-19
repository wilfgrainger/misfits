export function StatusBadge({ status }: { status: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'OPEN' | 'CLOSED' }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`status-badge status-${status.toLowerCase()}`}>{label}</span>;
}
