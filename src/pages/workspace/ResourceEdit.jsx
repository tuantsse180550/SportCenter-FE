import { useCallback } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { entityId, referenceId, resourceApis, classesApi, coachesApi } from '../../api/operations';
import { canReadResource, scopeCoachRecords } from '../../utils/role-workflows';
import { isResource, resources } from '../../utils/resources';
import { canUseResource, personalResources } from '../../utils/resource-access';
import { useActorProfile } from '../../hooks/useActorProfile';
import { useApiQuery } from '../../hooks/useApiQuery';
import { withQuery, workspacePath } from '../../utils/url';
import AccessScreen from '../../components/common/AccessScreen';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';
import ResourceForm from '../../components/resources/ResourceForm';

function ResourceEditor({ resource, id, defaults }) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const api = resourceApis[resource];
  const needsActor = (user.role === 'MEMBER' && personalResources.includes(resource))
    || (user.role === 'COACH' && ['attendances', 'lesson-progress', 'workout-plans', 'workout-results'].includes(resource));
  const actor = useActorProfile(needsActor);
  const actorId = actor.data ? entityId(actor.data) : '';

  const load = useCallback(async () => {
    const records = resource === 'rooms' && id ? [await resourceApis.rooms.get(token, id)] : await resourceApis[resource].list(token);
    if (!Array.isArray(records)) throw new Error('Danh sách từ máy chủ không hợp lệ.');
    if (user.role === 'COACH' && ['attendances', 'lesson-progress'].includes(resource)) {
      const [classes, students] = await Promise.all([classesApi.list(token), coachesApi.myStudents(token)]);
      return scopeCoachRecords(resource, records, classes.filter(item => referenceId(item.coachId) === actorId), students);
    }
    return records;
  }, [resource, token, id, user.role, actorId]);
  const query = useApiQuery(load, canReadResource(resource, user.role) && !!id && (!needsActor || !!actorId));

  if (!canReadResource(resource, user.role)) return <AccessScreen denied />;
  const selected = query.data?.find(item => entityId(item) === id);
  if (needsActor && (actor.loading || actor.error)) {
    return (
      <Screen>
        <QueryStatus loading={actor.loading} error={actor.error} retry={actor.reload} />
        {user.role === 'MEMBER' && <Link className="link" to="/profile">Hồ sơ hội viên →</Link>}
      </Screen>
    );
  }
  if (id && query.loading) return <Screen><QueryStatus loading /></Screen>;
  if (!canUseResource(resource, user.role, id ? 'update' : 'create', selected, actorId) || (id && !('update' in api))) return <AccessScreen denied />;

  const back = workspacePath(resource);
  return (
    <Screen>
      <Link className="link" to={back}>← {resources[resource].title}</Link>
      <h1 className="title">{id ? 'Chỉnh sửa' : 'Thêm'} {resources[resource].singular}</h1>
      {resource === 'coaches' && !id && (
        <p className="body">Nhập User ID của tài khoản có vai trò COACH. Muốn tạo cả tài khoản lẫn hồ sơ một lần, dùng <Link className="link" to="/staff-accounts">Tạo tài khoản nhân viên</Link>.</p>
      )}
      {id && <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />}
      {id && !query.loading && !query.error && !selected && <p className="error">Không tìm thấy bản ghi. Có thể dữ liệu đã được xóa.</p>}
      {(!id || selected) && (
        <ResourceForm
          key={id || 'new'}
          resource={resource}
          role={user.role}
          actorId={actorId}
          token={token}
          userId={user.id}
          defaults={!id && resource === 'attendances' ? defaults : undefined}
          initial={selected}
          onSave={input => (id ? api.update(token, id, input) : api.create(token, input))}
          onSaved={() => navigate(back)}
        />
      )}
    </Screen>
  );
}

export default function ResourceEdit() {
  const { resource } = useParams();
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const classId = params.get('classId') || '';
  if (!isResource(resource)) {
    return <Screen><h1 className="title">Không tìm thấy chức năng</h1><Link className="link" to="/operations">Quay lại</Link></Screen>;
  }
  // Registrations have their own flow.
  if (resource === 'class-registrations') {
    return <Navigate replace to={id ? withQuery('/registration-detail', { id }) : withQuery('/enroll', { classId })} />;
  }
  const defaults = Object.fromEntries(['classId', 'lessonId', 'date', 'scheduleId'].map(key => [key, params.get(key) || '']).filter(([, value]) => value));
  return <ResourceEditor key={`${resource}:${id || 'new'}:${params.toString()}`} resource={resource} id={id} defaults={defaults} />;
}
