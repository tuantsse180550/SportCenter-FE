import { Navigate, Outlet } from "react-router-dom";
import { roleHomePath, authService } from "../services/index.js";
import { useApp } from "../store/useApp.js";
import { Button, Card, LoadingScreen } from "../components/common/UI.jsx";
import { ErrorMessage } from "../components/common/AsyncPanel.jsx";
export function RoleGuard({ role }) {
  const { user, authLoading, authError, retryAuth } = useApp();
  if (authLoading) return <LoadingScreen />;
  if (authError) return <Card><ErrorMessage error={authError} /><Button onClick={retryAuth}>Thử khôi phục phiên</Button><Button variant="secondary" onClick={() => authService.logout()}>Đăng xuất</Button></Card>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHomePath[user.role] || "/login"} replace />;
  return <Outlet />;
}
