import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useActorProfile } from '../../hooks/useActorProfile';
import { entityId, referenceId } from '../../api/operations';
import { currency } from '../../api/payments';
import { buildCatalog, loadCatalog, timelineLabel } from '../../utils/class-catalog';
import { dayOf } from '../../utils/coach-teaching';
import { dayMonth, shortWeekday } from '../../utils/schedule-time';
import { videoEmbed } from '../../utils/video';
import { withQuery, workspacePath } from '../../utils/url';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import VideoEmbed from '../../components/common/VideoEmbed';
import ClassCover from '../../components/common/ClassCover';

const LESSONS_SHOWN = 6;
const SESSIONS_SHOWN = 6;

/** Class landing page: what you learn, when, with whom, for how much — and one clear call to action. */
export default function ClassDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const actor = useActorProfile(member);
  const memberId = actor.data ? entityId(actor.data) : '';
  const load = useCallback(() => loadCatalog(token), [token]);
  const query = useApiQuery(load);
  const [now] = useState(() => Date.now());
  const [openLesson, setOpenLesson] = useState('');
  const [allLessons, setAllLessons] = useState(false);

  // Staff see the class without anyone's registration attached.
  const entry = useMemo(() => (query.data
    ? buildCatalog({ ...query.data, classes: query.data.classes.filter(item => entityId(item) === id) }, { memberId: member ? memberId : '__staff__', now })[0] || null
    : null), [query.data, id, member, memberId, now]);
  const canEnroll = ['MEMBER', 'RECEPTIONIST', 'CENTER_MANAGER'].includes(user.role);
  const playing = entry ? entry.lessons.find(lesson => entityId(lesson) === openLesson) || entry.previewLesson : null;

  const cta = !entry ? null
    : member && entry.enrolled ? { label: 'Xem lịch học của tôi', icon: 'calendar', go: () => navigate(withQuery('/registration-detail', { id: entityId(entry.registration) })) }
      : member && entry.pending ? { label: 'Tiếp tục thanh toán', icon: 'wallet', go: () => navigate(withQuery('/payment-edit', { registrationId: entityId(entry.registration) })) }
        : canEnroll ? { label: member ? 'Đăng ký lớp này' : 'Đăng ký cho hội viên', icon: 'arrow', go: () => navigate(withQuery('/enroll', { classId: entry.id })) }
          : null;

  return (
    <div className="class-landing">
      <PageHeading
        title={entry?.name || 'Chi tiết lớp học'}
        back={{ to: member ? '/explore' : workspacePath('classes'), label: member ? 'Khám phá lớp học' : 'Lớp học' }}
        eyebrow={entry ? entry.subjectName.toUpperCase() : 'LỚP HỌC'}
      />
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {query.data && !entry && <section className="card flush"><Empty text="Không tìm thấy lớp học" detail="Lớp có thể đã đóng hoặc bị xóa." icon="layers" /></section>}

      {entry && (
        <>
          <section className="landing-hero-x">
            <ClassCover imageUrl={entry.imageUrl} subject={entry.subjectName} alt={entry.name} className="landing-cover" />
            <div className="landing-hero-text">
              <p className="landing-kicker">{entry.subjectName} · {entry.courseName}</p>
              <div className="landing-tags">
                <span className="class-tag">{timelineLabel(entry)}</span>
                {entry.sessions.length > 0 && <span className="class-tag">{entry.sessions.length} buổi</span>}
                {entry.lessons.length > 0 && <span className="class-tag">{entry.lessons.length} bài học</span>}
                {entry.previewLesson && <span className="class-tag video">Có video bài học</span>}
                {entry.enrolled && <span className="class-tag green">Bạn đã đăng ký</span>}
                {entry.pending && <span className="class-tag amber">Chờ thanh toán</span>}
              </div>
            </div>
          </section>

          <div className="landing-layout">
            <div className="stack">
              {playing && videoEmbed(playing.videoUrl) && (
                <section className="card flush">
                  <div className="card-heading"><h2>Bài mẫu · {playing.title}</h2><span className="subtle-tag">Bài {playing.order}</span></div>
                  <div className="session-body"><VideoEmbed url={playing.videoUrl} title={`Bài ${playing.order}: ${playing.title}`} /></div>
                </section>
              )}

              <section className="card flush">
                <div className="card-heading"><h2>Giới thiệu khóa học</h2></div>
                <div className="session-body">
                  <p className="body pre-line">{entry.description || `Khóa ${entry.courseName} do ${entry.coachLabel} phụ trách. Lộ trình được thiết kế theo từng bài, mỗi buổi có điểm danh và nhận xét để bạn theo dõi tiến bộ.`}</p>
                </div>
              </section>

              <section className="card flush">
                <div className="card-heading"><h2>Bạn sẽ học được gì</h2>{entry.lessons.length > 0 && <span className="subtle-tag">{entry.lessons.length} bài</span>}</div>
                {entry.lessons.length ? (
                  <ol className="lesson-list">
                    {(allLessons ? entry.lessons : entry.lessons.slice(0, LESSONS_SHOWN)).map(lesson => {
                      const lessonId = entityId(lesson);
                      return (
                        <li key={lessonId}>
                          <span className="lesson-order">{lesson.order}</span>
                          <div>
                            <b>{lesson.title}</b>
                            {lesson.description && <small>{lesson.description}</small>}
                          </div>
                          {videoEmbed(lesson.videoUrl) && (
                            <button type="button" className={`lesson-play ${playing && entityId(playing) === lessonId ? 'active' : ''}`} onClick={() => { setOpenLesson(lessonId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                              <Icon name="arrow" size={13} />Xem video
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : <div className="session-body"><p className="body small">Lộ trình bài học đang được cập nhật.</p></div>}
                {entry.lessons.length > LESSONS_SHOWN && (
                  <div className="session-body"><button type="button" className="text-btn" onClick={() => setAllLessons(value => !value)}>{allLessons ? 'Thu gọn' : `Xem thêm ${entry.lessons.length - LESSONS_SHOWN} bài`}</button></div>
                )}
              </section>

              <section className="card flush">
                <div className="card-heading"><h2>Lịch học sắp tới</h2>{entry.weekdayLabel && <span className="subtle-tag">{entry.weekdayLabel}{entry.timeRange ? ` · ${entry.timeRange}` : ''}</span>}</div>
                <div className="session-body">
                  {entry.upcoming.length ? (
                    <div className="session-chips">
                      {entry.upcoming.slice(0, SESSIONS_SHOWN).map(session => (
                        <span key={entityId(session)}>
                          <b>{shortWeekday(dayOf(session.date))} {dayMonth(dayOf(session.date))}</b>
                          {session.startTime}–{session.endTime}
                        </span>
                      ))}
                      {entry.upcoming.length > SESSIONS_SHOWN && <span className="more">+{entry.upcoming.length - SESSIONS_SHOWN} buổi</span>}
                    </div>
                  ) : <p className="body small">{entry.finished ? 'Lớp đã học xong các buổi đã xếp.' : 'Trung tâm đang xếp lịch cho lớp này.'}</p>}
                  {entry.upcoming[0]?.roomId && typeof entry.upcoming[0].roomId === 'object' && (
                    <p className="body small"><Icon name="room" size={14} /> {entry.upcoming[0].roomId.name}{entry.upcoming[0].roomId.roomNumber ? ` · ${entry.upcoming[0].roomId.roomNumber}` : ''}</p>
                  )}
                </div>
              </section>
            </div>

            <aside className="landing-aside">
              <section className="card">
                <div className="class-coach big"><Avatar name={entry.coachName} /><div><b>{entry.coachName}</b><small>Huấn luyện viên {entry.subjectName.toLowerCase()}</small></div></div>
                <div className="landing-price">
                  <strong>{typeof entry.price === 'number' ? currency(entry.price) : 'Liên hệ'}</strong>
                  <small>{entry.sessions.length ? `Trọn khóa ${entry.sessions.length} buổi${entry.perSession ? ` · ≈ ${currency(entry.perSession)}/buổi` : ''}` : 'Học phí trọn khóa'}</small>
                </div>
                {cta && <Button icon={cta.icon} onPress={cta.go}>{cta.label}</Button>}
                {!member && <Button secondary icon="calendar" onPress={() => navigate(workspacePath('schedules', { classId: entry.id }))}>Xem toàn bộ lịch lớp</Button>}
                <ul className="landing-perks">
                  <li><Icon name="check" size={14} />Thanh toán online qua payOS, xác nhận ngay</li>
                  <li><Icon name="check" size={14} />Điểm danh và nhận xét của HLV sau mỗi buổi</li>
                  <li><Icon name="check" size={14} />Kế hoạch tập theo mục tiêu của bạn</li>
                </ul>
              </section>
              {entry.nextSession && (
                <section className="card next-session">
                  <span className="eyebrow">BUỔI GẦN NHẤT</span>
                  <b>{shortWeekday(dayOf(entry.nextSession.date))}, {dayMonth(dayOf(entry.nextSession.date))} · {entry.nextSession.startTime}</b>
                  {typeof entry.nextSession.lessonId === 'object' && <small>{entry.nextSession.lessonId.title}</small>}
                  {(!member || entry.enrolled) && referenceId(entry.nextSession.lessonId) && <button type="button" className="text-btn" onClick={() => navigate(withQuery('/session', { id: entityId(entry.nextSession) }))}>Xem chi tiết buổi</button>}
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
