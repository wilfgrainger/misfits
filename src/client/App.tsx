import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppHeader } from './components/AppHeader';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyDashboardPage } from './pages/MyDashboardPage';
import { MyResultsPage } from './pages/MyResultsPage';
import { NewResultPage } from './pages/NewResultPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PlayersPage } from './pages/PlayersPage';
import { ResultsPage } from './pages/ResultsPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminPlayersPage } from './pages/admin/AdminPlayersPage';
import { AdminResultsPage } from './pages/admin/AdminResultsPage';
import { AdminLeaguePage } from './pages/admin/AdminLeaguePage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

function RequireUser() {
  const { user, loading } = useAuth();
  if (loading) return <main className="page"><p className="loading-state">Checking your session…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireOnboarded() {
  const { requiresOnboarding } = useAuth();
  if (requiresOnboarding) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/me" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireUser />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireOnboarded />}>
            <Route path="/me" element={<MyDashboardPage />} />
            <Route path="/results/new" element={<NewResultPage />} />
            <Route path="/my-results" element={<MyResultsPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="players" element={<AdminPlayersPage />} />
                <Route path="results" element={<AdminResultsPage />} />
                <Route path="league" element={<AdminLeaguePage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="settings" element={<Navigate to="/admin/league" replace />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<main className="page"><h1>Page not found</h1></main>} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
