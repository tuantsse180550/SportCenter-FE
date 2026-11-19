import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canManagePayments } from '../../api/payments';
import { canResolveSupport } from '../../api/support';
import { canManageMembers } from '../../utils/permissions';
import { roleHome, roleLabels } from '../../utils/staff-navigation';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';

export default function Account() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function refresh() {
    setBusy(true); setMessage(null);
    try { await refreshUser(); setMessage({ ok: true, text: 'Đã cập nhật thông tin tài khoản.' }); }
    catch (e) { setMessage({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  }

  const shortcuts = [
    ['Trang chủ của tôi', roleHome(user.role), 'grid', true],
    ['Hồ sơ tập luyện', '/profile', 'target', user.role === 'MEMBER'],
    ['Thông báo', '/notifications', 'bell', true],
    ['Thanh toán', '/payments', 'wallet', canManagePayments(user.role)],
    ['Hỗ trợ', '/support', 'help', user.role === 'MEMBER' || canResolveSupport(user.role)],
    [canManageMembers(user.role) ? 'Quản lý hội viên' : 'Danh sách hội viên', '/members', 'users', user.role !== 'MEMBER'],
    ['Tất cả tiện ích', '/operations', 'layers', true],
  ].filter(item => item[3]);

  return (
    <div className="screen">
      <PageHeading title="Tài khoản của tôi" description="Thông tin đăng nhập và lối tắt tới các chức năng thường dùng." />
      <section className="card flush">
        <div className="profile-summary" style={{ marginBottom: 0 }}>
          <Avatar name={user.name || user.email} />
          <div>
            <h2>{user.name || 'Người dùng'}</h2>
            <p>{user.email}</p>
          </div>
          <Badge status={user.status}>{user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status}</Badge>
        </div>
        <div className="detail-grid" style={{ padding: '0 20px 20px' }}>
          <div><span>Vai trò</span><b>{roleLabels[user.role] || user.role}</b></div>
          <div><span>Phiên đăng nhập</span><b>Tab hiện tại</b><small>Đóng tab sẽ cần đăng nhập lại.</small></div>
        </div>
      </section>
      {message && (
        <div className={`alert-box ${message.ok ? 'green' : 'red'}`} role="status">
          <Icon name={message.ok ? 'checkCircle' : 'alert'} size={18} /><p>{message.text}</p>
        </div>
      )}
      <section className="card flush">
        <div className="card-heading"><h2>Lối tắt</h2></div>
        <div className="shortcut-list">
          {shortcuts.map(([label, path, icon]) => (
            <button type="button" key={path} onClick={() => navigate(path)}>
              <span className="metric-icon orange"><Icon name={icon} size={18} /></span>
              {label}
              <Icon name="right" size={16} />
            </button>
          ))}
        </div>
      </section>
      <div className="row-actions">
        <Button secondary icon="repeat" disabled={busy} onPress={refresh}>{busy ? 'Đang cập nhật…' : 'Làm mới tài khoản'}</Button>
        <Button variant="danger" icon="logout" onPress={() => { logout(); navigate('/login', { replace: true }); }}>Đăng xuất</Button>
      </div>
    </div>
  );
}
