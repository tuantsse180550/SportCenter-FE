import { useCallback, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useScheduleAttendances } from '../../hooks/useScheduleAttendances';
import { attendancesApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { loadCoachAttendanceContext } from '../../services/coach-teaching';
import { attendanceMembers, dayOf } from '../../utils/coach-teaching';
import { currentStatus, rollCallChanges, rollCallCounts, savedAttendance } from '../../utils/roll-call';
import { memberHistory, sessionWindow } from '../../utils/attendance-day';
import { formatDateLabel } from '../../utils/schedule-time';
import { matches } from '../../utils/table';
import { withQuery, workspacePath } from '../../utils/url';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';

const FILTERS = [
  ['ALL', 'Tất cả'],
  ['UNMARKED', 'Chưa điểm danh'],
  ['PRESENT', 'Có mặt'],
  ['ABSENT', 'Vắng'],
];

/** Progress ring "8/10". */
function Ring({ value, total, size = 64, tone = 'orange', label }) {
  const radius = size / 2 - 6;
  const length = 2 * Math.PI * radius;
  const ratio = total ? value / total : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`att-ring ${tone}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={radius} className="ring-bg" />
      {ratio > 0 && <circle cx={size / 2} cy={size / 2} r={radius} className="ring-fg" strokeDasharray={`${length * ratio} ${length}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
      <text x={size / 2} y={size / 2 + 5}>{label}</text>
    </svg>
  );
}

/** Short note under a student's name from their recent attendance in this class. */
function historyNote(history) {
  if (history.total === 0) return { tone: 'blue', text: 'Buổi đầu tiên' };
  if (history.absentStreak >= 2) return { tone: 'red', text: `Vắng ${history.absentStreak} buổi liền` };
  if (history.presentStreak >= 3) return { tone: 'green', text: `${history.presentStreak} buổi liên tiếp` };
  return { tone: 'muted', text: `Đi ${history.present}/${history.total} buổi` };
}

/** One row of the roll-call table: number, student, last 5 sessions, Có mặt | Vắng. */
function StudentRow({ index, student, status, saved, changed, history, disabled, onMark }) {
  const name = String(student.fullName || 'Chưa có tên');
  const note = historyNote(history);
  return (
    <li className={`roll-line ${status ? status.toLowerCase() : 'unmarked'}${changed ? ' changed' : ''}`}>
      <span className="roll-no">{index + 1}</span>
      <div className="roll-who">
        <Avatar name={name} small />
        <div>
          <b>{name}</b>
          <small className={note.tone}>{note.text}{saved && changed ? ` · đã lưu: ${saved === 'PRESENT' ? 'có mặt' : 'vắng'}` : ''}</small>
        </div>
      </div>
      <div className="att-dots" title="5 buổi gần nhất" aria-label="5 buổi gần nhất">
        {Array.from({ length: 5 }, (_, slotIndex) => {
          const value = history.recent[history.recent.length - 5 + slotIndex];
          return <i key={slotIndex} className={value === 'PRESENT' ? 'p' : value === 'ABSENT' ? 'a' : ''} />;
        })}
      </div>
      <div className="roll-seg" role="group" aria-label={`Điểm danh ${name}`}>
        <button type="button" className={status === 'PRESENT' ? 'on present' : ''} aria-pressed={status === 'PRESENT'} disabled={disabled} onClick={() => onMark('PRESENT')}>Có mặt</button>
        <button type="button" className={status === 'ABSENT' ? 'on absent' : ''} aria-pressed={status === 'ABSENT'} disabled={disabled} onClick={() => onMark('ABSENT')}>Vắng</button>
      </div>
    </li>
  );
}

/** Roll call for ONE session (?scheduleId=): everything on the page is about that session. */
export default function RollCall() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scheduleId = params.get('scheduleId') || '';
  const { token } = useAuth();
  const [now] = useState(() => Date.now());
  const [marks, setMarks] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const pending = useRef(false);

  const load = useCallback(async () => {
    const [context, attendances] = await Promise.all([loadCoachAttendanceContext(token), attendancesApi.list(token)]);
    return { ...context, attendances: Array.isArray(attendances) ? attendances : [] };
  }, [token]);
  const query = useApiQuery(load);
  const data = query.data;
  const session = data?.schedules.find(item => entityId(item) === scheduleId) || null;
  const classId = session ? referenceId(session.classId) : '';
  const day = session ? dayOf(session.date) : '';
  const students = session ? attendanceMembers(data.students, classId) : [];
  const records = useScheduleAttendances(token, session ? scheduleId : '');
  const saved = savedAttendance(records.data || []);
  const slotEarly = session ? sessionWindow(session, now) : null;
  // A session nobody has marked yet starts with the whole class present: the coach only picks who is absent.
  const startsPresent = !!slotEarly?.editable && Array.isArray(records.data) && records.data.length === 0;
  const effective = startsPresent ? { ...Object.fromEntries(students.map(student => [entityId(student), 'PRESENT'])), ...marks } : marks;
  const changes = rollCallChanges(students, records.data || [], effective);
  const counts = rollCallCounts(students, records.data || [], effective);
  const slot = session ? sessionWindow(session, now) : null;
  const editable = !!slot?.editable && !records.loading && !records.error;
  const lesson = session && typeof session.lessonId === 'object' ? session.lessonId : null;

  const visible = students.filter(student => {
    const status = currentStatus(entityId(student), saved, effective);
    return (filter === 'ALL' || (filter === 'UNMARKED' ? !status : status === filter)) && matches(search, student.fullName, student.phone);
  });

  /** Fresh check before writing: the session is still scheduled and the students still confirmed. */
  async function freshSession() {
    const fresh = await loadCoachAttendanceContext(token);
    const current = fresh.schedules.find(item => entityId(item) === scheduleId && item.status !== 'CANCELLED');
    if (!current) throw new Error('Buổi học đã thay đổi hoặc bị hủy. Vui lòng tải lại trang.');
    return { current, confirmed: new Set(attendanceMembers(fresh.students, classId).map(entityId)) };
  }

  async function save() {
    if (pending.current || !session) return;
    setError('');
    if (!changes.length) { setError('Chưa có thay đổi để lưu.'); return; }
    pending.current = true; setBusy(true);
    try {
      const { current, confirmed } = await freshSession();
      const failed = [];
      for (const change of changes) {
        try {
          if (!confirmed.has(change.memberId)) throw new Error('không còn trong danh sách đã xác nhận');
          if (change.recordId) await attendancesApi.update(token, change.recordId, { memberId: change.memberId, classId, lessonId: referenceId(current.lessonId), date: dayOf(current.date), status: change.status });
          else await attendancesApi.coachCreate(token, change.memberId, entityId(current), change.status);
        } catch (e) {
          failed.push({ memberId: change.memberId, message: `${change.name || change.memberId}: ${e.message}` });
        }
      }
      const failedIds = new Set(failed.map(item => item.memberId));
      const final = students.map(student => ({ student, status: failedIds.has(entityId(student)) ? saved[entityId(student)]?.status : currentStatus(entityId(student), saved, effective) }));
      records.reload();
      query.reload();
      setMarks(current => Object.fromEntries(Object.entries(current).filter(([memberId]) => failedIds.has(memberId))));
      if (failed.length) {
        setError(`Lưu được ${changes.length - failed.length}/${changes.length} học viên. Chưa lưu: ${failed.map(item => item.message).join('; ')}`);
      } else {
        // Students absent again after missing the previous session need a follow-up call.
        const atRisk = final.filter(({ student, status }) => status === 'ABSENT' && memberHistory(entityId(student), classId, data.attendances, day).absentStreak >= 1).map(({ student }) => student);
        setDone({
          present: final.filter(item => item.status === 'PRESENT').length,
          absent: final.filter(item => item.status === 'ABSENT').length,
          unmarked: final.filter(item => !item.status).length,
          atRisk,
        });
        globalThis.scrollTo?.(0, 0);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  const back = { to: withQuery('/attendance', day ? { date: day } : {}), label: 'Điểm danh theo ngày' };

  if (done) {
    const total = done.present + done.absent;
    return (
      <div className="att-page">
        <PageHeading title="Đã lưu điểm danh" description={`${referenceLabel(session?.classId)} · ${formatDateLabel(day)} · ${session?.startTime}–${session?.endTime}`} back={back} />
        <section className="card att-done">
          <div className="att-done-ring">
            <Ring value={done.present} total={total} size={112} tone="green" label={total ? `${Math.round((done.present / total) * 100)}%` : '—'} />
            <b>{done.present} có mặt · {done.absent} vắng</b>
            {done.unmarked > 0 && <small>{done.unmarked} học viên chưa điểm danh</small>}
          </div>
          <div className="att-next">
            <span className="eyebrow">VIỆC TIẾP THEO CỦA BUỔI</span>
            <button type="button" onClick={() => navigate(workspacePath('lesson-progress'))}>
              <Icon name="check" size={18} /><div><b>Cập nhật tiến độ {lesson ? `bài ${lesson.order}` : 'bài học'}</b><small>{done.present} học viên có mặt</small></div><Icon name="right" size={16} />
            </button>
            <button type="button" onClick={() => navigate('/feedbacks')}>
              <Icon name="mail" size={18} /><div><b>Nhận xét buổi học</b><small>Cho cả lớp hoặc từng học viên</small></div><Icon name="right" size={16} />
            </button>
            {done.atRisk.map(student => (
              <button type="button" key={entityId(student)} className="risk" onClick={() => navigate(withQuery('/coach-students', { classId }))}>
                <Icon name="alert" size={18} /><div><b>Liên hệ {student.fullName}</b><small>Vắng nhiều buổi liền{student.phone ? ` · ${student.phone}` : ''}</small></div><Icon name="right" size={16} />
              </button>
            ))}
            <div className="row-actions">
              <Button secondary icon="left" onPress={() => navigate(back.to)}>Về điểm danh theo ngày</Button>
              <Button secondary icon="edit" onPress={() => setDone(null)}>Sửa điểm danh</Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="att-page">
      <PageHeading
        title={session ? referenceLabel(session.classId) : 'Điểm danh buổi học'}
        description={session ? `${formatDateLabel(day)} · ${session.startTime}–${session.endTime}${lesson ? ` · Bài ${lesson.order}: ${lesson.title}` : ''} · ${referenceLabel(session.roomId)}` : undefined}
        back={back}
        eyebrow="ĐIỂM DANH BUỔI HỌC"
      />
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {data && !session && (
        <section className="card flush"><Empty text="Không tìm thấy buổi học" detail="Buổi có thể đã bị hủy, hoặc không thuộc lớp bạn phụ trách." icon="calendar">
          <Button secondary onPress={() => navigate('/attendance')}>Về điểm danh hôm nay</Button>
        </Empty></section>
      )}

      {session && (
        <>
          <section className="card att-head">
            <Ring value={counts.present + counts.absent} total={students.length} label={`${counts.present + counts.absent}/${students.length}`} />
            <div className="att-head-stats">
              <span className="att-pill-inline"><i className={slot.phase} />{slot.label}</span>
              <div className="att-chips">
                {FILTERS.map(([key, label]) => {
                  const count = key === 'ALL' ? students.length : key === 'UNMARKED' ? counts.unmarked : key === 'PRESENT' ? counts.present : counts.absent;
                  return <button type="button" key={key} className={`${filter === key ? 'active' : ''} ${key.toLowerCase()}`} onClick={() => setFilter(key)}>{label} <small>{count}</small></button>;
                })}
              </div>
            </div>
            {editable && students.length > 0 && (
              <Button secondary icon="checkCircle" disabled={busy} onPress={() => setMarks(Object.fromEntries(students.map(student => [entityId(student), 'PRESENT'])))}>
                Tất cả có mặt
              </Button>
            )}
          </section>

          {startsPresent && (
            <div className="alert-box blue" role="status"><Icon name="checkCircle" size={18} /><p>Buổi chưa điểm danh: cả lớp đang được đánh <b>có mặt</b>. Chỉ cần chọn <b>Vắng</b> cho người không đến rồi bấm Lưu.</p></div>
          )}
          {!slot.editable && (
            <div className={`alert-box ${slot.phase === 'upcoming' ? 'blue' : 'amber'}`} role="status">
              <Icon name="lock" size={18} />
              <p>{slot.phase === 'upcoming' ? `${slot.label}. Bạn có thể xem trước danh sách học viên.` : slot.phase === 'cancelled' ? 'Buổi học đã hủy nên không điểm danh.' : `Buổi học đã quá ${7} ngày nên chỉ xem được. Liên hệ quản lý nếu cần sửa.`}</p>
            </div>
          )}
          <QueryStatus loading={records.loading} error={records.error} retry={records.reload} />

          {students.length > 6 && (
            <label className="explore-search att-search">
              <Icon name="search" size={18} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm học viên…" aria-label="Tìm học viên" />
            </label>
          )}

          {students.length ? (
            <section className="card flush roll-table">
              <div className="roll-head"><span>#</span><span>HỌC VIÊN</span><span>5 BUỔI GẦN NHẤT</span><span>TRẠNG THÁI</span></div>
              <ol>
              {visible.map(student => {
                const memberId = entityId(student);
                return (
                  <StudentRow
                    key={memberId}
                    index={students.indexOf(student)}
                    student={student}
                    status={currentStatus(memberId, saved, effective)}
                    saved={saved[memberId]?.status}
                    changed={changes.some(change => change.memberId === memberId)}
                    history={memberHistory(memberId, classId, data.attendances, day)}
                    disabled={!editable || busy}
                    onMark={value => setMarks(current => ({ ...current, [memberId]: value }))}
                  />
                );
              })}
              </ol>
              {!visible.length && <p className="body small roll-empty">Không có học viên ở bộ lọc này.</p>}
            </section>
          ) : (
            <section className="card flush"><Empty text="Lớp chưa có học viên đã xác nhận" detail="Học viên xuất hiện ở đây sau khi đăng ký và thanh toán học phí." icon="users" /></section>
          )}

          {error && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>{error}</p></div>}

          {editable && students.length > 0 && (
            <div className="att-savebar">
              <span><b>{counts.present}</b> có mặt · <b>{counts.absent}</b> vắng{counts.unmarked ? <> · <em>{counts.unmarked} chưa điểm danh</em></> : ''}</span>
              <Button icon="check" disabled={busy || !changes.length} onPress={save}>
                {busy ? 'Đang lưu…' : changes.length ? `Lưu điểm danh (${changes.length})` : 'Chưa có thay đổi'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
