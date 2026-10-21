import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PublicHeader } from "../components/common/PublicHeader.jsx";

const footerlessPaths = ["/login", "/register", "/forgot-password"];

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideFooter = footerlessPaths.includes(location.pathname);

  return <div className="public-shell"><PublicHeader /><Outlet />{!hideFooter && <footer className="public-footer"><div><strong>Sport Center</strong><p>Quản lý trung tâm thể thao hiện đại dành cho quản lý, huấn luyện viên, lễ tân và thành viên.</p></div><div><button onClick={() => navigate("/classes")}>Lớp học</button><button onClick={() => navigate("/pricing")}>Bảng giá</button><button onClick={() => navigate("/login")}>Đăng nhập</button></div></footer>}</div>;
}
