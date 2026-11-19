import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { entityId, referenceLabel } from '../../api/operations';
import { loadCoachRoster } from '../../services/coach-roster';
import { coachStudentName } from '../../utils/coach-roster';
import { search as matches } from '../../utils/url';
import { useApiQuery } from '../../hooks/useApiQuery';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import ListPage from '../../components/common/ListPage';

const filters = [['ALL', 'Tất cả'], ['PENDING_PAYMENT', 'Chờ thanh toán'], ['CONFIRMED', 'Đã xác nhận']];
const levels = { BEGINNER: 'Mới bắt đầu', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };

/** Coach: students registered in own classes, with goal and level. */
export default function CoachStudents() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const classId = params.get('classId') || '';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const load = useCallback(() => loadCoachRoster(token), [token]);
  const result = useApiQuery(load);
  const roster = (result.data || []).filter(item => !classId || entityId(item.class) === classId);
  // The coach API returns confirmed students only; the status filter matters only if pending ones appear.
  const hasPending = roster.some(item => item.status === 'PENDING_PAYMENT');
  const items = roster.filter(item => (!hasPending || status === 'ALL' || item.status === status)
    && matches(`${coachStudentName(item)} ${referenceLabel(item.class)} ${String(item.member?.phone || '')}`, query));

  return (
    <ListPage
      title="Học viên của tôi"
      description="Học viên đã xác nhận đăng ký (đã thanh toán) trong các lớp bạn phụ trách."
      items={items}
      loading={result.loading}
      error={result.error}
      reload={result.reload}
      controls={(
        <div className="stack-sm">
          <p className="body">{result.data ? `${new Set(roster.map(item => item.memberId)).size} học viên · ${roster.length} đăng ký` : 'Đang lấy dữ liệu học viên'}</p>
          <Field label="Tìm học viên hoặc lớp" type="search" value={query} onChangeText={setQuery} placeholder="Tên, lớp hoặc số điện thoại" />
          <div className="chip-row">
            {hasPending && filters.map(([value, label]) => <Button key={value} small secondary={status !== value} title={label} onPress={() => setStatus(value)} />)}
            <Button small secondary disabled={result.loading} title="↻ Làm mới" onPress={result.reload} />
          </div>
        </div>
      )}
      renderItem={item => (
        <article className="card">
          <span className={`badge status-${item.status}`}>{item.status === 'CONFIRMED' ? '✓ Đã xác nhận' : '◷ Chờ thanh toán'}</span>
          <h2 className="heading">{coachStudentName(item)}</h2>
          <p className="body">Lớp: {referenceLabel(item.class)}</p>
          {item.member?.phone && <p className="body">Điện thoại: {String(item.member.phone)}</p>}
          {item.member?.level && <p className="body">Trình độ: {levels[item.member.level] || item.member.level}</p>}
          {item.member?.goal && <p className="body">Mục tiêu: {String(item.member.goal)}</p>}
          {item.registeredAt && <p className="body small">Đăng ký: {new Date(String(item.registeredAt)).toLocaleDateString('vi-VN')}</p>}
        </article>
      )}
    />
  );
}
