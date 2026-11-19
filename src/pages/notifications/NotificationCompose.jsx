import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canSeeSentNotifications, canSendNotification, notificationsApi } from '../../api/notifications';
import { referenceId } from '../../api/operations';
import { studentMembers } from '../../utils/coach-teaching';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import RelationField from '../../components/common/RelationField';
import Screen from '../../components/common/Screen';
import { Icon } from '../../components/common/Icon';

/** Manager/receptionist notify anyone; a coach only confirmed students of own classes. */
export default function NotificationCompose() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [member, setMember] = useState('');
  const [coach, setCoach] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Who the last notification went to; the page then confirms it instead of leaving silently.
  const [recipientName, setRecipientName] = useState('');
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  if (!canSendNotification(user.role)) return <AccessScreen denied />;
  const isCoach = user.role === 'COACH';

  async function send(event) {
    event.preventDefault();
    if (pending.current) return;
    // A coach picks a student (member profile id) and uses the coach endpoint; staff pick a user id.
    const target = isCoach ? member : recipient;
    if (!/^[a-f\d]{24}$/i.test(target) || !title.trim() || !message.trim()) { setError('Chọn người nhận, nhập tiêu đề và nội dung.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      if (isCoach) await notificationsApi.coach(token, { memberId: member, title, message });
      else await notificationsApi.create(token, { userId: recipient, title, message });
      setSent({ to: recipientName || 'người nhận', title: title.trim() });
      setRecipient(''); setMember(''); setCoach(''); setRecipientName(''); setTitle(''); setMessage('');
    }
    catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <Screen>
      <Link className="link" to="/notifications">← Thông báo</Link>
      <h1 className="title">Gửi thông báo</h1>
      <p className="body">{isCoach ? 'Chọn học viên đã xác nhận trong lớp bạn phụ trách.' : 'Chọn hội viên hoặc huấn luyện viên nhận tin.'} Thông báo hiển thị trong ứng dụng, không gửi email.</p>
      {sent && (
        <div className="alert-box green" role="status">
          <Icon name="checkCircle" size={18} />
          <div className="stack-xs">
            <p><b>Đã gửi thông báo thành công</b> tới {sent.to}: “{sent.title}”.</p>
            <p className="body small">Người nhận sẽ thấy thông báo trong mục Thông báo của ứng dụng.</p>
            <div className="row-actions wrap">
              <Button small secondary onPress={() => setSent(null)}>Gửi thông báo khác</Button>
              <Button small secondary onPress={() => navigate(canSeeSentNotifications(user.role) ? '/notifications?tab=sent' : '/notifications')}>{canSeeSentNotifications(user.role) ? 'Xem thông báo đã gửi' : 'Về trang thông báo'}</Button>
            </div>
          </div>
        </div>
      )}
      <form className="card stack" onSubmit={send} noValidate>
        <RelationField
          label={isCoach ? 'Học viên nhận tin' : 'Hội viên nhận tin'}
          path={isCoach ? '/api/coaches/my-students' : '/api/members'}
          transformItems={isCoach ? rows => studentMembers(rows) : undefined}
          token={token} value={member} onChange={setMember} disabled={busy}
          onSelect={item => { setRecipient(referenceId(item.userId)); setRecipientName(String(item.fullName || item.member?.fullName || '')); setCoach(''); setSent(null); }}
        />
        {!isCoach && (
          <RelationField label="Huấn luyện viên nhận tin" path="/api/coaches" token={token} value={coach} onChange={setCoach} disabled={busy}
            onSelect={item => { setRecipient(referenceId(item.userId)); setRecipientName(String(item.fullName || '')); setMember(''); setSent(null); }} />
        )}
        <Field label="Tiêu đề" value={title} onChangeText={setTitle} editable={!busy} maxLength={200} />
        <Field label="Nội dung" multiline value={message} onChangeText={setMessage} editable={!busy} />
        {error && <p role="alert" className="error">{error}</p>}
        <div><Button type="submit" disabled={busy || !(isCoach ? member : recipient)} title={busy ? 'Đang gửi…' : 'Gửi thông báo'} /></div>
      </form>
    </Screen>
  );
}
