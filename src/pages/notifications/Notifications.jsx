import { useCallback, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { notificationsApi, ownNotifications, canSendNotification, canSeeSentNotifications, sentNotifications } from '../../api/notifications';
import { entityId } from '../../api/operations';
import Button from '../../components/common/Button';
import ListPage from '../../components/common/ListPage';
import { TableToolbar } from '../../components/common/DataTable';

const ROLE_LABELS = { MEMBER: 'Hội viên', COACH: 'Huấn luyện viên', RECEPTIONIST: 'Lễ tân', CENTER_MANAGER: 'Quản lý' };
const when = value => (value ? new Date(String(value)).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : '');
/** "an.nguyen · Hội viên" from a populated account. */
const accountLabel = (value, fallback) => {
  const account = value && typeof value === 'object' ? value : null;
  const name = account?.email ? String(account.email).split('@')[0] : fallback;
  return [name, ROLE_LABELS[account?.role]].filter(Boolean).join(' · ');
};
const recipientOf = item => accountLabel(item.userId, 'Người nhận');
/** Sender of a notification; automatic ones (reminders, registration updates) have none. */
const senderOf = item => (item.sentBy ? accountLabel(item.sentBy, 'Nhân viên') : 'Hệ thống tự động');
const SCOPES = [['me', 'Tôi đã gửi'], ['', 'Toàn trung tâm']];

export default function Notifications() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const canSeeSent = canSeeSentNotifications(user.role);
  // Manager / receptionist also see what the center has sent (?tab=sent, e.g. right after sending).
  const sentTab = canSeeSent && params.get('tab') === 'sent';
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('me');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const load = useCallback(async () => ownNotifications(await notificationsApi.my(token), user.id), [token, user.id]);
  const query = useApiQuery(load, !sentTab);
  const loadSent = useCallback(async () => sentNotifications(await notificationsApi.list(token, scope), user.id), [token, user.id, scope]);
  const sent = useApiQuery(loadSent, sentTab);

  async function toggle(item) {
    if (pending.current) return;
    pending.current = true; setBusy(entityId(item)); setError('');
    try { await notificationsApi.setRead(token, entityId(item), !item.isRead); query.reload(); }
    catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(''); }
  }

  const tabs = canSeeSent && (
    <div className="tabs">
      <button type="button" className={sentTab ? '' : 'active'} onClick={() => setParams({}, { replace: true })}>Thông báo của tôi</button>
      <button type="button" className={sentTab ? 'active' : ''} onClick={() => setParams({ tab: 'sent' }, { replace: true })}>Đã gửi</button>
    </div>
  );
  const sendButton = canSendNotification(user.role) && <Button small title="+ Gửi thông báo" onPress={() => navigate('/notification-compose')} />;

  if (sentTab) {
    const needle = search.trim().toLocaleLowerCase('vi');
    const items = (sent.data || []).filter(item => !needle || `${item.title} ${item.message} ${recipientOf(item)} ${senderOf(item)}`.toLocaleLowerCase('vi').includes(needle));
    const read = (sent.data || []).filter(item => item.isRead).length;
    return (
      <ListPage
        title="Thông báo đã gửi"
        description={sent.data ? `${sent.data.length} thông báo ${scope === 'me' ? 'bạn đã gửi' : 'trung tâm đã gửi'} · ${read} đã được đọc` : 'Thông báo đã gửi tới hội viên và nhân sự.'}
        items={items}
        loading={sent.loading}
        error={sent.error}
        reload={sent.reload}
        controls={(
          <div className="stack-sm">
            {tabs}
            <div className="row-actions wrap">
              {SCOPES.map(([value, label]) => <Button key={value || 'all'} small secondary={scope !== value} title={label} onPress={() => setScope(value)} />)}
              {sendButton}
            </div>
            <TableToolbar search={search} onSearch={setSearch} placeholder={scope === 'me' ? 'Tìm theo tiêu đề, nội dung hoặc người nhận…' : 'Tìm theo tiêu đề, người nhận hoặc người gửi…'} />
          </div>
        )}
        renderItem={item => (
          <article className="card">
            <p className="eyebrow">GỬI TỚI {recipientOf(item).toUpperCase()}</p>
            <h2 className="heading">{String(item.title || '')}</h2>
            <p className="body pre-line">{String(item.message || '')}</p>
            <p className="body small">{[when(item.createdAt), scope === 'me' ? '' : `Gửi bởi ${senderOf(item)}`, item.isRead ? '✓ Người nhận đã đọc' : '● Người nhận chưa đọc'].filter(Boolean).join(' · ')}</p>
          </article>
        )}
      />
    );
  }

  const count = query.data?.filter(item => !item.isRead).length;
  return (
    <ListPage
      title="Thông báo của tôi"
      description={count === undefined ? 'Cập nhật từ trung tâm và huấn luyện viên.' : `${count} thông báo chưa đọc`}
      items={(query.data || []).filter(item => !unreadOnly || !item.isRead)}
      loading={query.loading}
      error={query.error}
      reload={query.reload}
      controls={(
        <div className="stack-sm">
          {tabs}
          <div className="row-actions">
            <Button secondary small title={unreadOnly ? 'Hiện tất cả' : 'Chỉ hiện chưa đọc'} onPress={() => setUnreadOnly(v => !v)} />
            {sendButton}
            {error && <p role="alert" className="error">{error}</p>}
          </div>
        </div>
      )}
      renderItem={item => (
        <article className={`card${item.isRead ? '' : ' unread'}`}>
          <p className="eyebrow">{item.isRead ? 'ĐÃ ĐỌC' : '● CHƯA ĐỌC'}</p>
          <h2 className="heading">{String(item.title || '')}</h2>
          <p className="body pre-line">{String(item.message || '')}</p>
          <p className="body small">{when(item.createdAt)}</p>
          <div><Button secondary small disabled={!!busy} title={busy === entityId(item) ? 'Đang cập nhật…' : item.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'} onPress={() => toggle(item)} /></div>
        </article>
      )}
    />
  );
}
