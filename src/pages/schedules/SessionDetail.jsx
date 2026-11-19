import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { attendancesApi, entityId, lessonProgressApi, lessonsApi, referenceId, referenceLabel, schedulesApi } from '../../api/operations';
import { statusLabels } from '../../utils/resource-display';
import { formatDateLabel } from '../../utils/schedule-time';
import { dayOf } from '../../utils/coach-teaching';
import { withQuery, workspaceEditPath, workspacePath } from '../../utils/url';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import VideoEmbed from '../../components/common/VideoEmbed';

/** Bangkok wall-clock "YYYY-MM-DD HH:mm" → epoch ms. */
const at = (day, time) => Date.parse(`${day}T${time}:00+07:00`);

function timing(schedule, now) {
  if (schedule.status === 'CANCELLED') return { tone: 'red', text: 'Buổi học đã bị hủy' };
  const day = dayOf(schedule.date);
  const start = at(day, schedule.startTime);
  const end = at(day, schedule.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { tone: 'blue', text: '' };
  if (now >= end) return { tone: 'green', text: 'Buổi học đã diễn ra' };
  if (now >= start) return { tone: 'amber', text: `Đang diễn ra · còn ${Math.ceil((end - now) / 60000)} phút` };
  const minutes = Math.ceil((start - now) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return { tone: 'blue', text: `Còn ${days ? `${days} ngày ` : ''}${hours ? `${hours} giờ ` : ''}${days ? '' : `${minutes % 60} phút`}`.trim() + ' nữa bắt đầu' };
}

/**
 * The schedule list may not carry the lesson's video (the team backend populates only title,
 * description and order). Fill it in from the class's lessons; on failure keep the schedule as is.
 */
async function withLessonVideo(token, schedule) {
  const lesson = schedule.lessonId && typeof schedule.lessonId === 'object' ? schedule.lessonId : null;
  if (lesson?.videoUrl) return schedule;
  const classId = referenceId(schedule.classId);
  const lessonId = referenceId(schedule.lessonId);
  if (!classId || !lessonId) return schedule;
  const full = await lessonsApi.byClass(token, classId)
    .then(items => (Array.isArray(items) ? items.find(item => entityId(item) === lessonId) : null))
    .catch(() => null);
  if (!full?.videoUrl) return schedule;
  return { ...schedule, lessonId: { ...(lesson || {}), ...full, videoUrl: full.videoUrl } };
}

/** Session ("buổi tập") detail: schedule info, today's lesson with its guide video, and the member's result. */
export default function SessionDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const schedules = await (member ? schedulesApi.my(token) : user.role === 'COACH' ? schedulesApi.coachMy(token) : schedulesApi.list(token));
    const found = schedules.find(item => entityId(item) === id) || null;
    const schedule = found && await withLessonVideo(token, found);
    if (!schedule || !member) return { schedule };
    // The member's own record of this session (both are optional extras).
    const lessonId = referenceId(schedule.lessonId);
    const [attendance, progress] = await Promise.all([
      attendancesApi.my(token).then(items => items.find(item => referenceId(item.lessonId) === lessonId && dayOf(item.date) === dayOf(schedule.date)) || null).catch(() => null),
      lessonProgressApi.list(token).then(items => items.find(item => referenceId(item.lessonId) === lessonId) || null).catch(() => null),
    ]);
    return { schedule, attendance, progress };
  }, [token, id, member, user.role]);
  const query = useApiQuery(load, !!id);
  const schedule = query.data?.schedule;
  const lesson = schedule && typeof schedule.lessonId === 'object' ? schedule.lessonId : null;
  const classInfo = schedule && typeof schedule.classId === 'object' ? schedule.classId : null;
  const room = schedule && typeof schedule.roomId === 'object' ? schedule.roomId : null;
  const when = schedule ? timing(schedule, now) : null;
  const finished = when?.tone === 'green';
  const attendance = query.data?.attendance;
  const progress = query.data?.progress;

  return (
    <>
      <PageHeading
        title={classInfo ? String(classInfo.name) : 'Chi tiết buổi tập'}
        description={schedule ? `${formatDateLabel(dayOf(schedule.date))} · ${schedule.startTime}–${schedule.endTime}` : undefined}
        back={{ to: workspacePath('schedules'), label: member ? 'Lịch của tôi' : 'Lịch tập' }}
        eyebrow="BUỔI TẬP"
        actions={schedule && !member && schedule.status === 'SCHEDULED' && (
          <Button icon="checkCircle" onPress={() => navigate(user.role === 'COACH' ? withQuery('/attendance/session', { scheduleId: id }) : workspaceEditPath('attendances', { scheduleId: id, classId: referenceId(schedule.classId), lessonId: referenceId(schedule.lessonId), date: dayOf(schedule.date) }))}>Điểm danh buổi này</Button>
        )}
      />
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {query.data && !schedule && (
        <section className="card flush"><Empty text="Không tìm thấy buổi tập" detail={member ? 'Buổi này không thuộc lớp bạn đã đăng ký và thanh toán.' : 'Buổi tập có thể đã bị xóa.'} icon="calendar" /></section>
      )}

      {schedule && (
        <>
          <div className={`alert-box ${when.tone}`} role="status">
            <Icon name={finished ? 'checkCircle' : schedule.status === 'CANCELLED' ? 'alert' : 'clock'} size={19} />
            <p><b>{when.text}</b>{schedule.status !== 'SCHEDULED' && <> · {statusLabels[schedule.status] || schedule.status}</>}</p>
          </div>

          <div className="session-layout">
            <section className="card flush session-lesson">
              <div className="card-heading">
                <h2>{lesson ? `Bài ${lesson.order}: ${lesson.title}` : 'Bài học của buổi'}</h2>
                {lesson?.videoUrl && <span className="subtle-tag">▶ Có video</span>}
              </div>
              <div className="session-body">
                <VideoEmbed
                  url={lesson?.videoUrl}
                  title={lesson ? `Video bài ${lesson.order}: ${lesson.title}` : 'Video bài học'}
                  fallback={<div className="video-empty"><Icon name="sport" size={26} /><p>Huấn luyện viên chưa thêm video cho bài này.</p></div>}
                />
                {lesson?.videoUrl && <p className="body small">{finished ? 'Xem lại động tác của buổi hôm nay để tự luyện ở nhà.' : 'Xem trước động tác để buổi tập hiệu quả hơn.'}</p>}
                <h3 className="session-subtitle">Nội dung bài học</h3>
                <p className="body pre-line">{lesson?.description || 'Chưa có mô tả cho bài học này.'}</p>
              </div>
            </section>

            <aside className="stack">
              <section className="card flush">
                <div className="card-heading"><h2>Thông tin buổi</h2></div>
                <div className="detail-grid session-facts">
                  <div><span>Ngày</span><b>{formatDateLabel(dayOf(schedule.date))}</b></div>
                  <div><span>Giờ</span><b>{schedule.startTime} – {schedule.endTime}</b></div>
                  <div><span>Phòng tập</span><b>{room ? `${room.name}${room.roomNumber ? ` · ${room.roomNumber}` : ''}` : referenceLabel(schedule.roomId)}</b></div>
                  <div><span>Huấn luyện viên</span><b>{classInfo?.coachId ? referenceLabel(classInfo.coachId) : '—'}</b></div>
                  <div><span>Môn</span><b>{classInfo?.subjectId ? referenceLabel(classInfo.subjectId) : '—'}</b></div>
                  <div><span>Trạng thái</span><Badge status={schedule.status}>{statusLabels[schedule.status] || schedule.status}</Badge></div>
                </div>
              </section>

              {member && (
                <section className="card flush">
                  <div className="card-heading"><h2>Kết quả của bạn</h2></div>
                  <div className="session-body">
                    {attendance
                      ? <p className="body">Điểm danh: <Badge status={attendance.status}>{attendance.status === 'PRESENT' ? 'Có mặt' : 'Vắng'}</Badge></p>
                      : <p className="body small">{finished ? 'Chưa có điểm danh cho buổi này.' : 'Điểm danh sẽ có sau buổi học.'}</p>}
                    {progress && <p className="body">Tiến độ bài: <Badge status={progress.status}>{statusLabels[progress.status] || progress.status}</Badge></p>}
                    {progress?.coachComment && (
                      <blockquote className="coach-note"><Icon name="mail" size={15} /> <span><b>Nhận xét của HLV:</b> {progress.coachComment}</span></blockquote>
                    )}
                    <div className="row-actions">
                      <Button secondary small icon="help" onPress={() => navigate(withQuery('/support', { topic: `Buổi ${dayOf(schedule.date)} ${schedule.startTime} – ${classInfo?.name || ''}` }))}>Hỏi trung tâm về buổi này</Button>
                    </div>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </>
  );
}
