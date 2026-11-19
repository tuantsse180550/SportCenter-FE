import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Requires a signed-in user; otherwise sends them to /login and comes back after. */
export default function ProtectedRoute() {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="page-loading">Đang tải phiên đăng nhập…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
