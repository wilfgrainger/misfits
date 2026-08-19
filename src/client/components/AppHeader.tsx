import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/');
  }

  return (
    <header className="site-header">
      <NavLink to="/" className="brand-link" aria-label="Misfits 501 home">
        <img className="brand-logo" src="/brand/misfits-501.webp" alt="Misfits 501" width="384" height="384" />
      </NavLink>
      <nav aria-label="Primary navigation">
        <NavLink to="/">League</NavLink>
        <NavLink to="/results">Results</NavLink>
        <NavLink to="/players">Players</NavLink>
        {!loading && user ? <NavLink to="/me">My league</NavLink> : null}
        {!loading && user?.role === 'ADMIN' ? <NavLink to="/admin">Admin</NavLink> : null}
      </nav>
      <div className="account-actions">
        {!loading && !user ? <NavLink className="button-link" to="/login">Sign in</NavLink> : null}
        {!loading && user ? (
          <button type="button" className="text-button" onClick={() => void signOut()}>
            Sign out{user.username ? ` · ${user.username}` : ''}
          </button>
        ) : null}
      </div>
    </header>
  );
}
