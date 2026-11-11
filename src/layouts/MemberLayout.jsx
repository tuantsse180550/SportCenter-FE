import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../components/common/UI.jsx";
import { authService } from "../services/index.js";
import { useApp } from "../store/useApp.js";
import "./member.css";
const links = [["Trang chủ", "/member/home", "grid"], ["Lịch sử điểm danh", "/member/attendance", "clipboard"], ["Khám phá lớp học", "/member/classes", "activity"], ["Lịch học của tôi", "/member/schedule", "calendar"], ["Thanh toán của tôi", "/member/payments", "card"], ["Lớp đã đăng ký", "/member/home#registrations", "clipboard"], ["Kết quả tập luyện", "/member/results", "chart"], ["Kế hoạch và phản hồi", "/member/training", "clipboard"], ["Thông báo", "/member/notifications", "history"], ["Hỗ trợ", "/member/support", "users"], ["Tài khoản", "/member/account", "user"]];
export function MemberLayout() {
  const [open, setOpen] = useState(false); const { user, setUser } = useApp(); const location = useLocation();
  const menu = useRef(null); const sidebar = useRef(null); const main = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = menu.current;
    document.body.style.overflow = "hidden";
    const content = main.current;
    content.inert = true;
    sidebar.current.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = [...sidebar.current.querySelectorAll("a, button")].filter(el => el.getClientRects().length);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    const wide = window.matchMedia("(min-width: 1024px)");
    const resize = () => { if (wide.matches) setOpen(false); };
    wide.addEventListener("change", resize);
    return () => { document.body.style.overflow = previousOverflow; content.inert = false; document.removeEventListener("keydown", keydown); wide.removeEventListener("change", resize); trigger?.focus(); };
  }, [open]);
  const logout = () => { authService.logout(); setUser(null); window.location.replace("/"); };
  const history = location.pathname === "/member/home" && location.hash === "#registrations";
  const title = location.pathname.startsWith("/member/classes/") ? "Chi tiết lớp học" : links.find(([, path]) => path === location.pathname + location.hash)?.[0] || links.find(([, path]) => path === location.pathname)?.[0] || "Sport Center";
  return <div className="member-site member-sidebar-layout"><a className="member-skip" href="#member-content">Đến nội dung chính</a>{open && <div className="member-drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}<aside ref={sidebar} id="member-sidebar" className={"member-sidebar" + (open ? " is-open" : "")} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Điều hướng thành viên"><div className="member-sidebar-brand"><NavLink className="member-brand" to="/member/home" onClick={() => setOpen(false)}><span><Icon name="activity" /></span><strong>Sport Center<small>Vận động mỗi ngày</small></strong></NavLink><button className="member-drawer-close" aria-label="Đóng trình đơn" onClick={() => setOpen(false)}><Icon name="close" /></button></div><nav id="member-navigation" aria-label="Điều hướng thành viên">{links.map(([label, to, icon]) => { const active = to.includes("#") ? history : to === "/member/home" ? location.pathname === to && !history : location.pathname === to || location.pathname.startsWith(to + "/"); return <NavLink key={to} to={to} className={() => active ? "active" : ""} aria-current={active ? "page" : false} onClick={() => setOpen(false)}><Icon name={icon} /><span>{label}</span></NavLink>; })}</nav><div className="member-sidebar-user"><span className="member-user-avatar">{(user.name || user.email).slice(0,1).toLocaleUpperCase("vi")}</span><div><strong>{user.name || "Thành viên"}</strong><small>Thành viên Sport Center</small></div><button className="member-sidebar-logout" onClick={logout}>Đăng xuất</button></div></aside><div ref={main} className="member-main"><header className="member-topbar"><button ref={menu} className="member-menu-toggle" aria-label="Mở trình đơn" aria-expanded={open} aria-controls="member-sidebar" onClick={() => setOpen(true)}><Icon name="grid" /></button><span>{title}</span><NavLink className="member-topbar-profile" to="/member/account" aria-label="Mở tài khoản"><Icon name="user" /></NavLink></header><main id="member-content" className="member-content" tabIndex={-1}><Outlet /></main><footer className="member-footer"><strong>Sport Center</strong><span>Cùng bạn xây dựng thói quen vận động.</span><NavLink to="/">Trang công khai</NavLink></footer></div></div>;
}
