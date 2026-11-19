import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi, ownNotifications } from '../api/notifications';
import { useApiQuery } from '../hooks/useApiQuery';
import { Icon } from '../components/common/Icon';
import Avatar from '../components/common/Avatar';
import { isActiveItem, mobileTabsFor, navFor, pageTitle, roleLabels } from '../utils/staff-navigation';
import { withQuery } from '../utils/url';

/** ActiveHub design shell (sidebar, topbar, mobile tabs) for every signed-in role. */
export default function AppShell() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The mobile menu is open only on the page where it was opened, so navigating closes it.
  const [menuPath, setMenuPath] = useState(null);
  const sideOpen = menuPath === pathname;
  const setSideOpen = open => setMenuPath(open ? pathname : null);
  const [search, setSearch] = useState('');
  const role = user.role;
  const title = pageTitle(role, pathname);
  const loadNotices = useCallback(async () => ownNotifications(await notificationsApi.my(token), user.id), [token, user.id]);
  const notices = useApiQuery(loadNotices);
  const unread = (notices.data || []).filter(item => !item.isRead).length;
  const { reload: reloadNotices } = notices;

  useEffect(() => { document.title = `${title} · ActiveHub`; }, [title]);
  // Refresh the unread dot and start each page at the top.
  useEffect(() => { reloadNotices(); window.scrollTo(0, 0); }, [pathname, reloadNotices]);

  function submitSearch(event) {
    event.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(role === 'MEMBER' ? withQuery('/explore', { q }) : role === 'COACH' ? withQuery('/workspace/classes', { q }) : withQuery('/members', { q }));
    setSearch('');
  }

  return (
    <div className="app-shell">
      {sideOpen && <div className="sidebar-backdrop" onClick={() => setSideOpen(false)} />}
      <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
        <Link className="brand" to={navFor(role)[0].items[0].path}>
          <span className="brand-mark"><Icon name="sport" size={24} /></span>
          <span className="brand-word">Active<span>Hub</span><small>SPORT CENTER WORKSPACE</small></span>
        </Link>
        <div className="workspace-select">
          <span className="workspace-icon"><Icon name="room" size={20} /></span>
          <div>
            <b>Trung tâm ActiveHub</b>
            <small><i />{roleLabels[role]}</small>
          </div>
        </div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {navFor(role).map(group => (
            <div className="nav-group" key={group.section}>
              <p>{group.section}</p>
              {group.items.map(entry => (
                <NavLink key={entry.path} to={entry.path} className={() => `nav-item ${isActiveItem(pathname, entry) ? 'active' : ''}`}>
                  <Icon name={entry.icon} size={19} />
                  <span>{entry.label}</span>
                  {entry.path === '/notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
                  {entry.tag && <span className="new-tag">{entry.tag}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link className="help-link" to={role === 'COACH' ? '/notifications' : '/support'}>
            <Icon name="help" size={19} />
            Trợ giúp & hỗ trợ
            <Icon name="arrow" size={15} />
          </Link>
          <button type="button" className="sidebar-user" onClick={() => navigate('/account')}>
            <Avatar name={user.name} small tone="orange" />
            <div>
              <b>{user.name}</b>
              <small>{roleLabels[role]}</small>
            </div>
            <Icon name="right" size={15} />
          </button>
          <button type="button" className="sidebar-logout" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
            <Icon name="logout" size={17} /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button type="button" className="mobile-menu icon-btn" aria-label="Mở điều hướng" aria-expanded={sideOpen} onClick={() => setSideOpen(!sideOpen)}>
              <Icon name="menu" />
            </button>
            <span>Không gian làm việc</span>
            <Icon name="right" size={13} />
            <b>{title}</b>
          </div>
          <div className="topbar-actions">
            <form className="global-search" role="search" onSubmit={submitSearch}>
              <Icon name="search" size={17} />
              <input aria-label="Tìm kiếm" value={search} onChange={event => setSearch(event.target.value)} placeholder={role === 'MEMBER' || role === 'COACH' ? 'Tìm lớp học...' : 'Tìm hội viên...'} />
              <kbd>↵</kbd>
            </form>
            <button type="button" className={`notification-button icon-btn ${unread ? 'has-notice' : ''}`} onClick={() => navigate('/notifications')} aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}>
              <Icon name="bell" size={21} />
            </button>
            <span className="topbar-divider" />
            <button type="button" className="topbar-avatar" aria-label="Tài khoản" onClick={() => navigate('/account')}>
              <Avatar name={user.name} small tone="orange" />
            </button>
          </div>
        </header>
        <main key={pathname} className="main-content">
          <Outlet />
          <footer className="page-footer">
            <span>© 2026 ActiveHub. Cùng bạn chuyển động mỗi ngày.</span>
            <span><i />Kết nối máy chủ SportCenter</span>
          </footer>
        </main>
      </div>

      <nav className="mobile-tabs" aria-label="Điều hướng nhanh">
        {mobileTabsFor(role).map(entry => (
          <Link key={entry.path} to={entry.path} className={isActiveItem(pathname, entry) ? 'active' : ''}>
            <Icon name={entry.icon} size={21} />
            <span>{entry.label.split(' ').slice(0, 2).join(' ')}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
