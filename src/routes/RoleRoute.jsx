import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../utils/staff-navigation';

/**
 * Only renders child routes for the listed roles. Use inside <ProtectedRoute>.
 * This is UI gating only — the backend still enforces permissions.
 */
export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <main className="page-narrow">
        <h1 className="title">Bạn chưa có quyền truy cập</h1>
        <p className="body">Tài khoản hiện tại không được phép mở trang này.</p>
        <Link className="link" to={roleHome(user?.role)}>← Về trang chủ của tôi</Link>
      </main>
    );
  }
  return <Outlet />;
}
