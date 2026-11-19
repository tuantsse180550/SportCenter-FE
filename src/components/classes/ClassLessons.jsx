import { useCallback } from 'react';
import { useApiQuery } from '../../hooks/useApiQuery';
import { entityId, lessonsApi } from '../../api/operations';
import QueryStatus from '../common/QueryStatus';

export default function ClassLessons({ token, classId }) {
  const load = useCallback(() => lessonsApi.byClass(token, classId), [token, classId]);
  const query = useApiQuery(load);
  return (
    <section className="card">
      <h2 className="heading">Bài học của lớp</h2>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {query.data?.length === 0 && <p className="body">Chưa có bài học được trả về cho lớp này.</p>}
      <ol className="lesson-list">
        {query.data?.map(item => (
          <li key={entityId(item)}>
            <strong>{String(item.order || '')}. {String(item.title || '')}</strong>
            {item.description && <p className="body">{String(item.description)}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
