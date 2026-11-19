import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { membersApi } from '../../api/members';
import { useApiQuery } from '../../hooks/useApiQuery';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';
import MemberForm from '../../components/members/MemberForm';

/** Member creates / updates own profile (fullName, phone, goal, level). */
export default function Profile() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [saved, setSaved] = useState(false);
  const load = useCallback(() => membersApi.me(token), [token]);
  const query = useApiQuery(load, user.role === 'MEMBER');
  if (user.role !== 'MEMBER') return <AccessScreen denied />;

  return (
    <Screen>
      <Link className="link" to="/account">← Tài khoản</Link>
      <h1 className="title">{query.missing ? 'Tạo hồ sơ hội viên' : 'Hồ sơ của tôi'}</h1>
      <p className="body">Huấn luyện viên dùng mục tiêu và trình độ để lập kế hoạch tập phù hợp cho bạn.</p>
      {saved && (
        <div className="stack-sm">
          <p role="status" className="success">Đã lưu hồ sơ thành công.</p>
          <div><Button small title="Tiếp tục tới trang chủ →" onPress={() => navigate('/member')} /></div>
        </div>
      )}
      <QueryStatus loading={query.loading} error={query.missing ? null : query.error} retry={() => { setSaved(false); query.reload(); }} />
      {!query.loading && (query.data || query.missing) && (
        <MemberForm
          key={query.data?.updatedAt || (query.missing ? 'new' : 'existing')}
          initial={query.data || undefined}
          onSave={input => (query.missing ? membersApi.createMe(token, input) : membersApi.updateMe(token, input))}
          onSaved={() => { setSaved(true); query.reload(); }}
        />
      )}
    </Screen>
  );
}
