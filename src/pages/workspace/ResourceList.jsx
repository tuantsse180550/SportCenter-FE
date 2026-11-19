import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { titleFor, detailFor, statusLabels } from '../../utils/resource-display';
import { entityId, referenceId, resourceApis, attendancesApi, schedulesApi, coachesApi, classesApi, coursePrice } from '../../api/operations';
import { resources, isResource } from '../../utils/resources';
import { canUseResource, isOwnRecord, personalResources } from '../../utils/resource-access';
import { teachingResources, scopeTeachingResources, dayOf } from '../../utils/coach-teaching';
import { loadTeachingScope } from '../../services/coach-teaching';
import { canReadResource, scopeCoachRecords } from '../../utils/role-workflows';
import { useActorProfile } from '../../hooks/useActorProfile';
import { useApiQuery } from '../../hooks/useApiQuery';
import { bangkokDate, search as matches, withQuery, workspaceEditPath, workspacePath } from '../../utils/url';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import ConfirmButton from '../../components/common/ConfirmButton';
import Badge from '../../components/common/Badge';
import Empty from '../../components/common/Empty';
import PageHeading from '../../components/common/PageHeading';
import { Pagination, TableToolbar } from '../../components/common/DataTable';
import { usePaged } from '../../hooks/usePaged';
import QueryStatus from '../../components/common/QueryStatus';
import SubjectFilter from '../../components/common/SubjectFilter';
import WeekTimetable from '../../components/schedules/WeekTimetable';
import { loadSubjectIndex, SUBJECT_RESOURCES, subjectCounts, subjectOf, subjectTone } from '../../utils/subject-filter';
import Screen from '../../components/common/Screen';
import ActivityHistory from '../manager/ActivityHistory';

function CourseInfo({ course, subjectNames }) {
  const subject = course.subjectId?.name || subjectNames?.get(referenceId(course.subjectId));
  const price = coursePrice(course);
  const description = course.description?.trim();

  return (
    <dl className="course-info">
      <div className="course-info-meta">
        <div>
          <dt>Bộ môn</dt>
          <dd>{subject || <span className="course-info-muted">Chưa rõ bộ môn</span>}</dd>
        </div>
        <div>
          <dt>Học phí</dt>
          <dd>
            {price === undefined ? <span className="course-info-muted">Chưa thiết lập</span>
              : price === 0 ? 'Miễn phí'
                : <>{price.toLocaleString('vi-VN')} ₫ <span className="course-info-muted">/ suất</span></>}
          </dd>
        </div>
      </div>
      <div className="course-info-description">
        <dt>Mô tả</dt>
        <dd>{description || <span className="course-info-muted">Chưa có mô tả</span>}</dd>
      </div>
    </dl>
  );
}

/** The status has its own column, so drop it from the detail text. */
function withoutStatus(detail, status) {
  const label = statusLabels[status] || String(status || '');
  if (!label) return detail;
  return detail.split('\n').map(line => line.replace(` · ${label}`, '').replace(`${label} · `, '')).filter(line => line.trim() && line !== label).join('\n');
}

const RESOURCE_GROUPS = [
  ['subjects', 'courses', 'learning-paths', 'lessons'],
  ['classes', 'class-registrations', 'attendances'],
  ['workout-plans', 'workout-results', 'lesson-progress'],
  ['rooms', 'schedules'],
];

const coachScoped = ['classes', 'schedules', 'attendances', 'lesson-progress', 'workout-plans', 'workout-results', ...teachingResources];

function ResourceListView({ resource, courseId, classId, date }) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const role = user.role;
  const definition = resources[resource];
  const api = resourceApis[resource];
  const needsActor = (role === 'MEMBER' && personalResources.includes(resource)) || (role === 'COACH' && coachScoped.includes(resource));
  const actor = useActorProfile(needsActor);
  const actorId = actor.data ? entityId(actor.data) : '';
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState('');
  // Sport filter ('' = all, '-' = unknown sport); kept in the URL so it survives switching tabs.
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const bySubject = SUBJECT_RESOURCES.includes(resource);
  const loadIndex = useCallback(() => loadSubjectIndex(token), [token]);
  const subjectIndex = useApiQuery(loadIndex, bySubject).data;
  const [allSchedules, setAllSchedules] = useState(false);
  const mine = resource === 'schedules' && role === 'MEMBER' && !classId && !allSchedules;

  const load = useCallback(async () => {
    let records;
    if (resource === 'attendances' && role === 'MEMBER') records = await attendancesApi.my(token);
    else if (mine) records = await schedulesApi.my(token);
    else if (resource === 'schedules' && role === 'COACH') records = await schedulesApi.coachMy(token);
    else records = await resourceApis[resource].list(token);
    if (!Array.isArray(records)) throw new Error('Danh sách từ máy chủ không hợp lệ.');
    const filtered = records.filter(item => (!courseId || resource !== 'classes' || referenceId(item.courseId) === courseId)
      && (!classId || resource !== 'schedules' || referenceId(item.classId) === classId)
      && (!date || resource !== 'schedules' || dayOf(item.date) === date));
    if (role === 'COACH' && teachingResources.includes(resource)) {
      const scope = await loadTeachingScope(token, actorId);
      return scopeTeachingResources(resource, filtered, scope.classes, scope.paths);
    }
    if (role === 'COACH' && ['attendances', 'lesson-progress'].includes(resource)) {
      const [classes, students] = await Promise.all([classesApi.list(token), coachesApi.myStudents(token)]);
      return scopeCoachRecords(resource, filtered, classes.filter(item => referenceId(item.coachId) === actorId), students);
    }
    return needsActor ? filtered.filter(item => isOwnRecord(resource, role, actorId, item)) : filtered;
  }, [resource, token, mine, needsActor, actorId, role, courseId, classId, date]);

  const result = useApiQuery(load, canReadResource(resource, role) && (!needsActor || !!actorId));
  // The member's timetable marks past sessions present / absent; a failure only hides the marks.
  const loadAttendance = useCallback(() => attendancesApi.my(token), [token]);
  const attendance = useApiQuery(loadAttendance, mine);
  const subjectOptions = useMemo(
    () => (bySubject && subjectIndex ? subjectCounts(resource, result.data || [], subjectIndex) : []),
    [bySubject, subjectIndex, resource, result.data],
  );
  const items = useMemo(() => {
    const wanted = subject === '-' ? '' : subject;
    const rows = (result.data || []).filter(item => (!status || item.status === status)
      && (!subject || !subjectIndex || subjectOf(resource, item, subjectIndex) === wanted)
      && matches(`${titleFor(resource, item)} ${detailFor(resource, item)}`, query));
    // Schedules read best in time order.
    return resource === 'schedules'
      ? [...rows].sort((a, b) => `${dayOf(a.date)} ${a.startTime}`.localeCompare(`${dayOf(b.date)} ${b.startTime}`))
      : rows;
  }, [result.data, resource, query, status, subject, subjectIndex]);

  const paged = usePaged(items, `${query}|${status}|${subject}`);
  const changeSubject = value => {
    setSubject(value);
    const next = new URLSearchParams(window.location.search);
    if (value) next.set('subject', value); else next.delete('subject');
    navigate({ search: next.toString() ? `?${next}` : '' }, { replace: true });
  };

  if (!canReadResource(resource, role)) return <AccessScreen denied />;
  const canEnroll = ['MEMBER', 'RECEPTIONIST', 'CENTER_MANAGER'].includes(role);
  const canCreate = resource === 'class-registrations' ? canEnroll : canUseResource(resource, role, 'create', undefined, actorId);
  const create = () => navigate(resource === 'class-registrations' ? '/enroll' : workspaceEditPath(resource));
  const heading = date && resource === 'schedules' ? `Lịch ngày ${date}`
    : classId && resource === 'schedules' ? 'Lịch của lớp'
      : mine ? 'Lịch tập của tôi'
        : role === 'COACH' && resource === 'schedules' ? 'Lịch dạy của tôi'
          : role === 'COACH' && resource === 'classes' ? 'Lớp của tôi'
            : role === 'MEMBER' && resource === 'class-registrations' ? 'Đăng ký của tôi'
              : role === 'MEMBER' && resource === 'attendances' ? 'Lịch sử điểm danh'
                : definition.title;

  const statuses = [...new Set((result.data || []).map(item => item.status).filter(Boolean))];
  const row = item => (
    <tr key={entityId(item)}>
      <td><b>{titleFor(resource, item)}</b></td>
      {resource === 'courses'
        ? <td className="course-info-cell"><CourseInfo course={item} subjectNames={subjectIndex?.names} /></td>
        : <td className="cell-detail">{statuses.length > 0 ? withoutStatus(detailFor(resource, item), item.status) : detailFor(resource, item)}</td>}
      {statuses.length > 0 && <td>{item.status && <Badge status={item.status}>{statusLabels[item.status] || String(item.status)}</Badge>}</td>}
      <td>
        <div className="row-actions wrap">
          {resource === 'classes' && <Button secondary small onPress={() => navigate(withQuery('/class-detail', { id: entityId(item) }))}>Chi tiết</Button>}
          {resource === 'classes' && role === 'COACH' && <Button secondary small onPress={() => navigate(workspacePath('schedules', { classId: entityId(item), date: bangkokDate() }))}>Lịch hôm nay</Button>}
          {resource === 'classes' && role === 'COACH' && <Button secondary small onPress={() => navigate(withQuery('/coach-students', { classId: entityId(item) }))}>Học viên</Button>}
          {resource === 'classes' && canEnroll && <Button small onPress={() => navigate(withQuery('/enroll', { classId: entityId(item) }))}>Đăng ký</Button>}
          {resource === 'schedules' && <Button secondary={role !== 'MEMBER'} small icon="sport" onPress={() => navigate(withQuery('/session', { id: entityId(item) }))}>Chi tiết buổi</Button>}
          {resource === 'schedules' && item.status === 'SCHEDULED' && ['COACH', 'RECEPTIONIST', 'CENTER_MANAGER'].includes(role) && (
            <Button secondary small icon="checkCircle" onPress={() => navigate(role === 'COACH' ? withQuery('/attendance/session', { scheduleId: entityId(item) }) : workspaceEditPath('attendances', { scheduleId: entityId(item), classId: referenceId(item.classId), lessonId: referenceId(item.lessonId), date: String(item.date).slice(0, 10) }))}>Điểm danh</Button>
          )}
          {resource === 'class-registrations' && (
            <>
              <Button secondary small onPress={() => navigate(withQuery('/registration-detail', { id: entityId(item) }))}>{item.status === 'CONFIRMED' ? 'Xem lịch học' : 'Chi tiết'}</Button>
              {item.status === 'PENDING_PAYMENT' && canEnroll && <Button small icon="wallet" onPress={() => navigate(withQuery('/payment-edit', { registrationId: entityId(item) }))}>Thanh toán</Button>}
            </>
          )}
          {resource !== 'class-registrations' && canUseResource(resource, role, 'update', item, actorId) && 'update' in api && (
            <button type="button" className="text-btn" onClick={() => navigate(workspaceEditPath(resource, { id: entityId(item) }))}>Chỉnh sửa</button>
          )}
          {canUseResource(resource, role, 'remove', item, actorId) && 'remove' in api && (
            <ConfirmButton
              small secondary danger label="Xóa" title={`Xóa ${titleFor(resource, item)}?`}
              description="Thao tác không thể hoàn tác. Bản ghi đang được sử dụng có thể bị máy chủ từ chối xóa."
              confirmLabel="Xác nhận xóa" busyLabel="Đang xóa…"
              onConfirm={() => api.remove(token, entityId(item))} onDone={result.reload}
            />
          )}
        </div>
      </td>
    </tr>
  );

  const coachAttendance = resource === 'attendances' && role === 'COACH' && !query && !status;
  const groupTabs = (RESOURCE_GROUPS.find(group => group.includes(resource)) || []).filter(name => canReadResource(name, role));
  const subjectIds = subjectOptions.map(item => item.id);
  const head = <tr><th>{definition.singular.toUpperCase()}</th><th>THÔNG TIN</th>{statuses.length > 0 && <th>TRẠNG THÁI</th>}<th>THAO TÁC</th></tr>;

  return (
    <>
      <PageHeading
        title={heading}
        description={result.data ? `${result.data.length} bản ghi · ${definition.title}` : 'Dữ liệu trung tâm'}
        back={role === 'MEMBER' ? undefined : { to: '/operations', label: 'Tất cả chức năng' }}
        actions={(
          <>
            {resource === 'schedules' && !classId && role === 'MEMBER' && <Button secondary icon="calendar" onPress={() => setAllSchedules(value => !value)}>{mine ? 'Khám phá lịch các lớp' : 'Về lịch tập của tôi'}</Button>}
            {resource === 'schedules' && role === 'CENTER_MANAGER' && <Button secondary icon="upload" onPress={() => navigate('/schedule-import')}>Import lịch từ Excel</Button>}
            {['courses', 'learning-paths', 'lessons', 'classes'].includes(resource) && role === 'CENTER_MANAGER' && <Button secondary icon="upload" onPress={() => navigate('/catalog-import')}>Nhập từ Excel</Button>}
            {(date || classId || courseId) && <Button secondary icon="close" onPress={() => navigate(workspacePath(resource))}>Bỏ lọc</Button>}
            {canCreate && <Button icon="plus" onPress={create}>{resource === 'class-registrations' ? 'Đăng ký lớp' : `Thêm ${definition.singular}`}</Button>}
          </>
        )}
      />
      {groupTabs.length > 1 && (
        <div className="tabs">
          {groupTabs.map(name => (
            <button type="button" key={name} className={name === resource ? 'active' : ''} onClick={() => navigate(workspacePath(name, subject && SUBJECT_RESOURCES.includes(name) ? { subject } : undefined))}>{resources[name].title}</button>
          ))}
        </div>
      )}
      <QueryStatus loading={needsActor && actor.loading} error={needsActor ? actor.error : null} retry={actor.reload} />
      {needsActor && actor.error && role === 'MEMBER' && <Link className="link" to="/profile">Tạo hồ sơ hội viên →</Link>}

      <SubjectFilter options={subjectOptions} value={subject} onChange={changeSubject} total={(result.data || []).length} />

      {/* A member's own schedule is a weekly timetable; the plain list is for everyone else. */}
      {mine && <QueryStatus loading={result.loading} error={result.error} retry={result.reload} />}
      {mine && result.data && (
        <WeekTimetable sessions={items} today={bangkokDate()}
          toneOf={item => subjectTone(subjectOf(resource, item, subjectIndex), subjectIds)}
          onOpen={item => navigate(withQuery('/session', { id: entityId(item) }))}
          onExplore={() => navigate('/enroll')}
          attendance={attendance.data} />
      )}

      {!mine && <section className="card flush">
        <TableToolbar search={query} onSearch={setQuery} placeholder={`Tìm ${definition.singular}…`} filter={status} onFilter={setStatus}
          options={statuses.length > 1 ? [{ value: '', label: 'Mọi trạng thái' }, ...statuses.map(value => ({ value, label: statusLabels[value] || value }))] : undefined} />
        <QueryStatus loading={result.loading} error={result.error} retry={result.reload} />
        {result.data && (
          <>
            <div className="table-scroll">
              <table>
                <thead>{head}</thead>
                <tbody>
                  {paged.visible.map(row)}
                </tbody>
              </table>
              {!items.length && (
                <Empty
                  text={query || status ? 'Không có kết quả phù hợp' : mine ? 'Chưa có lịch tập' : coachAttendance ? 'Lớp của bạn chưa có buổi nào được điểm danh' : 'Chưa có dữ liệu'}
                  detail={query || status ? 'Thử từ khóa hoặc bộ lọc khác.' : mine ? 'Lịch xuất hiện sau khi đăng ký lớp được xác nhận và thanh toán.' : resource === 'lesson-progress' && role === 'MEMBER' ? 'Huấn luyện viên sẽ cập nhật tiến độ từng bài sau mỗi buổi học.' : coachAttendance ? 'Danh sách này ghi lại các buổi đã điểm danh. Chọn buổi dạy trong lịch để điểm danh cả lớp.' : undefined}
                >
                  {role === 'MEMBER' && ['schedules', 'class-registrations'].includes(resource) && <Button icon="arrow" onPress={() => navigate('/enroll')}>Khám phá và đăng ký lớp</Button>}
                  {coachAttendance && <Button icon="checkCircle" onPress={() => navigate(workspaceEditPath('attendances'))}>Điểm danh buổi dạy</Button>}
                  {coachAttendance && <Button secondary icon="calendar" onPress={() => navigate(workspacePath('schedules'))}>Xem lịch dạy</Button>}
                </Empty>
              )}
            </div>
            <Pagination paged={paged} />
          </>
        )}
      </section>}

    </>
  );
}

export default function ResourceList() {
  const { resource } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  // Members browse classes in the storefront page.
  if (resource === 'classes' && user.role === 'MEMBER' && !params.get('courseId')) return <Navigate to={withQuery('/explore', params.get('q') ? { q: params.get('q') } : {})} replace />;
  // The activity log reads as a timeline of sentences, not as a generic record list.
  if (resource === 'activity-logs' && user.role === 'CENTER_MANAGER') return <ActivityHistory />;
  if (!isResource(resource)) {
    return <Screen><PageHeading title="Không tìm thấy chức năng" back={{ to: '/operations', label: 'Quay lại' }} /></Screen>;
  }
  const courseId = params.get('courseId') || '';
  const classId = params.get('classId') || '';
  const date = params.get('date') || '';
  return <ResourceListView key={`${resource}:${classId}:${courseId}:${date}`} resource={resource} courseId={courseId} classId={classId} date={date} />;
}
