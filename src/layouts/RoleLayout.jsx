import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Icon } from "../components/common/UI.jsx";
import { authService, roleHomePath, roleLabels } from "../services/index.js";
import { useApp } from "../store/useApp.js";
import { roleNavigation } from "../types/navigation.js";

export function RoleLayout({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const navItems = roleNavigation[role];

  const logout = () => {
    authService.logout();
    setUser(null);
    window.location.replace("/");
  };

  return <div className="internal-shell"><aside className="sidebar"><button className="brand dark" onClick={() => navigate(roleHomePath[role])}><span><Icon name="activity" /></span><strong>Sport Center</strong><small>Trung tâm thể thao</small></button><nav>{navItems.map(([label, href, icon]) => <button key={href} className={location.pathname === href || location.pathname.startsWith(href + "/") ? "active" : ""} onClick={() => navigate(href)}><Icon name={icon} />{label}</button>)}</nav></aside><main className="workspace"><header className="topbar"><div><span>{roleLabels[role]}</span><strong>{user.name}</strong></div><div className="topbar-actions"><span>{user.email}</span><Button variant="secondary" onClick={logout}>Đăng xuất</Button></div></header><div className="mobile-nav">{navItems.map(([label, href]) => <button key={href} className={location.pathname === href ? "active" : ""} onClick={() => navigate(href)}>{label}</button>)}</div><section className="page-shell"><Outlet /></section></main></div>;
}
