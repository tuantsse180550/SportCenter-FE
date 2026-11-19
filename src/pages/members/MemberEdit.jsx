import { useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { membersApi, memberId } from '../../api/members';
import { useApiQuery } from '../../hooks/useApiQuery';
import MemberForm from '../../components/members/MemberForm';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';

/** Edit an existing profile (?id=) or create one for an existing MEMBER account. */
export default function MemberEdit() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const { token } = useAuth();
  const load = useCallback(() => membersApi.list(token), [token]);
  const query = useApiQuery(load, !!id);
  const selected = query.data?.find(member => memberId(member) === id);

  return (
    <Screen>
      <Link className="link" to="/members">← Danh sách hội viên</Link>
      <h1 className="title">{id ? 'Chỉnh sửa hội viên' : 'Thêm hồ sơ hội viên'}</h1>
      {!id && <p className="body">Dùng khi hội viên đã tự tạo tài khoản nhưng chưa có hồ sơ. Hội viên mới hoàn toàn: dùng <Link className="link" to="/members/front-desk">đăng ký tại quầy</Link>.</p>}
      {id && <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />}
      {id && !query.loading && !query.error && !selected && <p className="error">Không tìm thấy hồ sơ. Có thể hồ sơ đã được xóa.</p>}
      {(!id || selected) && (
        <MemberForm
          key={id || 'new'}
          initial={selected}
          requireUserId={!id}
          requireGoal={false}
          onSave={(input, userId) => (id ? membersApi.update(token, id, input) : membersApi.create(token, userId, input))}
          onSaved={() => navigate('/members')}
        />
      )}
    </Screen>
  );
}
