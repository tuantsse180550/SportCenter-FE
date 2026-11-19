import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { coursesApi, coursePrice, entityId, referenceLabel } from '../../api/operations';
import { currency } from '../../api/payments';
import { workspacePath } from '../../utils/url';
import Button from '../../components/common/Button';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';

/** Courses = the center's packages: one-time tuition per class type. */
export default function Pricing() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const load = useCallback(() => coursesApi.list(token), [token]);
  const query = useApiQuery(load);
  const active = (query.data || []).filter(item => item.status === 'ACTIVE');

  return (
    <Screen wide>
      <Link className="link" to={user.role === 'MEMBER' ? '/member' : '/operations'}>← Không gian của tôi</Link>
      <header className="page-header">
        <p className="eyebrow">ĐẦU TƯ CHO SỨC KHỎE</p>
        <h1 className="title">Khóa học & học phí</h1>
        <p className="body">Mỗi khóa học có một mức học phí cho 1 suất trong lớp, tính một lần theo toàn bộ lịch của lớp.</p>
      </header>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      <div className="card-grid">
        {active.map(item => (
          <article key={entityId(item)} className="card price-card">
            <p className="eyebrow">{referenceLabel(item.subjectId)}</p>
            <h2 className="heading">{String(item.name || '')}</h2>
            <dl className="price-list">
              <div><dt>Học phí / suất</dt><dd>{currency(coursePrice(item))}</dd></div>
            </dl>
            {item.description && <p className="body">{String(item.description)}</p>}
            <Button title="Tìm lớp để tham gia →" onPress={() => navigate(workspacePath('classes', { courseId: entityId(item) }))} />
          </article>
        ))}
      </div>
      {query.data && !active.length && <p className="body">Chưa có khóa học đang hoạt động.</p>}
    </Screen>
  );
}
