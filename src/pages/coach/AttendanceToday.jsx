import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { attendancesApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { loadCoachAttendanceContext } from '../../services/coach-teaching';
import { attendanceMembers, dayOf } from '../../utils/coach-teaching';
import { EDITABLE_DAYS, sessionProgress, sessionWindow, weekStart } from '../../utils/attendance-day';
import { addDays, dayMonth, formatDateLabel, shortWeekday } from '../../utils/schedule-time';
import { bangkokDate, workspaceEditPath, workspacePath } from '../../utils/url';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';

const rollCallPath = session => workspaceEditPath('attendances', { scheduleId: entityId(session), classId: referenceId(session.classId), date: dayOf(session.date) });

/** Small progress ring for a day in the week strip. state: done | partial | todo | none */
function DayRing({ day, state, ratio, active, onPick }) {
  const circumference = 2 * Math.PI * 15;
  return (
    <button type="button" className={`att-day ${state}${active ? ' active' : ''}`} onClick={onPick} aria-pressed={active} aria-label={`${formatDateLabel(day)}`}>
      <span>{shortWeekday(day)}</span>
      <svg viewBox="0 0 38 38" aria-hidden="true">
        <circle cx="19" cy="19" r="15" className="ring-bg" />
        {state !== 'none' && <circle cx="19" cy="19" r="15" className="ring-fg" strokeDasharray={`${circumference * ratio} ${circumference}`} transform="rotate(-90 19 19)" />}
        <text x="19" y="23">{day.slice(8, 10)}</text>
      </svg>
    </button>
  );
}

/** Coach "Điểm danh": the day's sessions first, then the one to mark. */
export default function AttendanceToday() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { token } = useAuth();
  const today = bangkokDate();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : today;
  const [now] = useState(() => Date.now());
  const load = useCallback(async () => {
    const [context, attendances] = await Promise.all([loadCoachAttendanceContext(token), attendancesApi.list(token)]);
    return { ...context, attendances: Array.isArray(attendances) ? attendances : [] };
  }, [token]);
  const query = useApiQuery(load);
  const data = query.data;
  const pick = value => setParams(value === today ? {} : { date: value });

  const view = useMemo(() => {
    if (!data) return null;
    const studentIds = classId => attendanceMembers(data.students, classId).map(entityId);
    const sessions = data.schedules
      .filter(item => item.status !== 'CANCELLED')
      .map(session => ({ session, window: sessionWindow(session, now), progress: sessionProgress(session, data.attendances, studentIds(referenceId(session.classId))) }))
      .sort((a, b) => `${dayOf(a.session.date)} ${a.session.startTime}`.localeCompare(`${dayOf(b.session.date)} ${b.session.startTime}`));
    // Sessions that should be marked but are not complete yet (still editable).
    const overdue = sessions.filter(item => item.window.phase === 'ended' && item.progress.total > 0 && !item.progress.complete);
    const monday = weekStart(day);
    const week = Array.from({ length: 7 }, (_, index) => {
      const value = addDays(monday, index);
      const ofDay = sessions.filter(item => dayOf(item.session.date) === value);
      const due = ofDay.filter(item => ['live', 'ended', 'expired'].includes(item.window.phase) && item.progress.total > 0);
      const done = due.filter(item => item.progress.complete).length;
      const state = !ofDay.length ? 'none' : !due.length ? 'todo' : done === due.length ? 'done' : 'partial';
      return { value, state, ratio: !ofDay.length ? 0 : due.length ? done / due.length : 0 };
    });
    // Attendance rate over this week's saved records.
    const weekRows = data.attendances.filter(item => dayOf(item.date) >= monday && dayOf(item.date) <= addDays(monday, 6));
    const rate = weekRows.length ? Math.round((weekRows.filter(item => item.status === 'PRESENT').length / weekRows.length) * 100) : null;
    return { day: sessions.filter(item => dayOf(item.session.date) === day), overdue, week, rate, studentIds };
  }, [data, day, now]);

  const featured = view?.day.find(item => item.window.phase === 'live') || view?.day.find(item => item.window.phase === 'upcoming');
  const others = view?.day.filter(item => item !== featured) || [];

  return (
    <div className="att-page">
      <PageHeading
        title={day === today ? 'Điểm danh hôm nay' : `Điểm danh ${shortWeekday(day)} ${dayMonth(day)}`}
        description={view ? `${formatDateLabel(day)} · ${view.day.length ? `${view.day.length} buổi dạy` : 'không có buổi dạy'}` : 'Lịch dạy và điểm danh theo ngày.'}
        actions={<Button secondary icon="history" onPress={() => navigate(workspacePath('attendances'))}>Lịch sử điểm danh</Button>}
      />
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />

      {view && (
        <>
          <section className="att-week card flush">
            <button type="button" className="icon-btn" aria-label="Tuần trước" onClick={() => pick(addDays(weekStart(day), -7))}><Icon name="left" size={18} /></button>
            <div className="att-week-days">
              {view.week.map(item => <DayRing key={item.value} day={item.value} state={item.state} ratio={item.ratio} active={item.value === day} onPick={() => pick(item.value)} />)}
            </div>
            <button type="button" className="icon-btn" aria-label="Tuần sau" onClick={() => pick(addDays(weekStart(day), 7))}><Icon name="right" size={18} /></button>
            {day !== today && <button type="button" className="text-btn" onClick={() => pick(today)}>Hôm nay</button>}
          </section>

          <div className="att-layout">
            <div className="stack">
              {featured ? (
                <section className={`att-hero ${featured.window.phase}`}>
                  <div className="att-hero-top">
                    <span className="att-pill"><i />{featured.window.label}</span>
                    <span>{featured.session.startTime} – {featured.session.endTime}</span>
                  </div>
                  <h2>{referenceLabel(featured.session.classId)}</h2>
                  <p>Bài {typeof featured.session.lessonId === 'object' ? `${featured.session.lessonId.order}: ` : ''}{referenceLabel(featured.session.lessonId)} · {referenceLabel(featured.session.roomId)}</p>
                  {featured.window.phase === 'live' && <div className="att-bar"><i style={{ width: `${Math.round((featured.window.progress || 0) * 100)}%` }} /></div>}
                  <div className="att-hero-foot">
                    <div className="att-avatars">
                      {attendanceMembers(data.students, referenceId(featured.session.classId)).slice(0, 4).map(member => <Avatar key={entityId(member)} name={member.fullName} small />)}
                      <span>{featured.progress.total} học viên{featured.progress.marked ? ` · đã điểm danh ${featured.progress.marked}` : ''}</span>
                    </div>
                    {featured.window.editable
                      ? <Button icon="checkCircle" onPress={() => navigate(rollCallPath(featured.session))}>{featured.progress.marked ? 'Tiếp tục điểm danh' : 'Điểm danh ngay'}</Button>
                      : <Button secondary icon="lock" onPress={() => navigate(rollCallPath(featured.session))}>Xem trước danh sách</Button>}
                  </div>
                </section>
              ) : !view.day.length && (
                <section className="card flush">
                  <Empty text={day === today ? 'Hôm nay bạn không có buổi dạy' : 'Ngày này không có buổi dạy'} detail="Chọn ngày khác trên thanh tuần, hoặc xem toàn bộ lịch dạy." icon="calendar">
                    <Button secondary icon="calendar" onPress={() => navigate(workspacePath('schedules'))}>Xem lịch dạy</Button>
                  </Empty>
                </section>
              )}

              {others.length > 0 && (
                <section className="card flush">
                  <div className="card-heading"><h2>{featured ? 'Các buổi khác trong ngày' : 'Buổi dạy trong ngày'}</h2></div>
                  <ol className="att-timeline">
                    {others.map(({ session, window, progress }) => (
                      <li key={entityId(session)} className={window.phase}>
                        <b className="att-time">{session.startTime}<small>{session.endTime}</small></b>
                        <div className="att-info">
                          <strong>{referenceLabel(session.classId)}</strong>
                          <small>{referenceLabel(session.lessonId)} · {referenceLabel(session.roomId)}</small>
                        </div>
                        <span className={`att-status ${progress.complete ? 'done' : window.phase}`}>
                          {progress.complete ? `Đã điểm danh ${progress.present}/${progress.total}`
                            : window.phase === 'upcoming' ? <><Icon name="lock" size={12} />Mở lúc {window.opensAt}</>
                              : window.phase === 'expired' ? 'Quá hạn sửa'
                                : progress.marked ? `Còn ${progress.total - progress.marked} chưa điểm danh` : 'Chưa điểm danh'}
                        </span>
                        <Button small secondary={progress.complete || !window.editable} onPress={() => navigate(rollCallPath(session))}>
                          {progress.complete || !window.editable ? 'Xem' : 'Điểm danh'}
                        </Button>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <aside className="stack">
              <section className={`card att-todo${view.overdue.length ? ' warn' : ''}`}>
                <b><Icon name={view.overdue.length ? 'alert' : 'checkCircle'} size={16} />{view.overdue.length ? `${view.overdue.length} buổi chưa điểm danh xong` : 'Không có buổi bị sót'}</b>
                {view.overdue.slice(0, 4).map(({ session, progress }) => (
                  <button type="button" key={entityId(session)} onClick={() => navigate(rollCallPath(session))}>
                    {shortWeekday(dayOf(session.date))} {dayMonth(dayOf(session.date))} · {session.startTime}
                    <small>{progress.marked}/{progress.total} học viên</small>
                  </button>
                ))}
                <small className="att-note">Điểm danh mở trước giờ học 15 phút và sửa được trong {EDITABLE_DAYS} ngày.</small>
              </section>
              <section className="card att-rate">
                <span>Chuyên cần tuần này</span>
                <strong>{view.rate === null ? '—' : `${view.rate}%`}</strong>
                <small>{view.rate === null ? 'Chưa có buổi nào được điểm danh trong tuần.' : 'Tính trên các buổi đã điểm danh.'}</small>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
