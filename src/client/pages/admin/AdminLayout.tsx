import { NavLink, Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <main className="page admin-page">
      <header className="admin-heading">
        <div><p className="eyebrow">League control</p><h1>Admin</h1></div>
      </header>
      <nav className="admin-nav" aria-label="Admin navigation">
        <NavLink end to="/admin">Dashboard</NavLink>
        <NavLink to="/admin/players">Players</NavLink>
        <NavLink to="/admin/results">Results</NavLink>
        <NavLink to="/admin/league">League</NavLink>
        <NavLink to="/admin/audit">Audit</NavLink>
      </nav>
      <Outlet />
    </main>
  );
}
