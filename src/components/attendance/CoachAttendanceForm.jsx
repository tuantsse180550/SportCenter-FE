import { useCallback, useRef, useState } from 'react';
import Button from '../common/Button';
import Field from '../common/Field';
import QueryStatus from '../common/QueryStatus';
import { loadCoachAttendanceContext } from '../../services/coach-teaching';
import { attendancesApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useScheduleAttendances } from '../../hooks/useScheduleAttendances';
import { classSessions, attendanceMembers, dayOf } from '../../utils/coach-teaching';
import { currentStatus, rollCallChanges, rollCallCounts, savedAttendance } from '../../utils/roll-call';
import { formatDateLabel } from '../../utils/schedule-time';
import { bangkokDate, withQuery } from '../../utils/url';
import { Navigate } from 'react-router-dom';

const statusText = { PRESENT: 'Có mặt', ABSENT: 'Vắng mặt' };

/**
 * Coach attendance. New: class → day → session, then mark the whole class as a list and save once.
 * Editing an existing record (`initial`) keeps the single-student flow.
 */
export default function CoachAttendanceForm(props) {
  // New roll calls use the day page and the one-session page; this form only edits an existing record.
  if (!props.initial) return <Navigate to={props.defaults?.scheduleId ? withQuery('/attendance/session', { scheduleId: props.defaults.scheduleId }) : '/attendance'} replace />;
  return <EditAttendanceForm {...props} />;
}

function EditAttendanceForm({ token, initial, defaults, onSaved }) {
  const [classId, setClassId] = useState(referenceId(initial?.classId) || defaults?.classId || '');
  const [day, setDay] = useState(dayOf(initial?.date) || defaults?.date || bangkokDate());
  const [scheduleId, setScheduleId] = useState(defaults?.scheduleId || '');
  const [status, setStatus] = useState(initial?.status === 'ABSENT' ? 'ABSENT' : 'PRESENT');
  const [marks, setMarks] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const load = useCallback(() => loadCoachAttendanceContext(token), [token]);
  const query = useApiQuery(load);
  const data = query.data;
  const selectedClass = data?.classes.find(item => entityId(item) === classId);
  const sessions = selectedClass ? classSessions(data?.schedules || [], classId, day) : [];
  const selected = initial
    ? sessions.find(item => referenceId(item.lessonId) === referenceId(initial.lessonId))
    : sessions.find(item => entityId(item) === scheduleId) || (!scheduleId && sessions.length === 1 ? sessions[0] : undefined);
  const students = selectedClass ? attendanceMembers(data?.students || [], classId) : [];
  const records = useScheduleAttendances(token, selected ? entityId(selected) : '');
  const saved = savedAttendance(records.data || []);
  const changes = rollCallChanges(students, records.data || [], marks);
  const counts = rollCallCounts(students, records.data || [], marks);
  const locked = busy || !!initial;
  const resetSession = () => { setScheduleId(''); setMarks({}); setError(''); };

  /** Fresh check: the session is still scheduled and the students are still confirmed in the class. */
  async function freshSession() {
    const fresh = await loadCoachAttendanceContext(token);
    const current = fresh.schedules.find(item => entityId(item) === entityId(selected) && item.status !== 'CANCELLED' && dayOf(item.date) === day && referenceId(item.classId) === classId && referenceId(item.lessonId) === referenceId(selected.lessonId));
    if (!current) throw new Error('Buổi học đã thay đổi hoặc bị hủy. Vui lòng tải lại buổi học.');
    return { current, confirmed: new Set(attendanceMembers(fresh.students, classId).map(entityId)) };
  }

  async function saveRollCall() {
    if (pending.current) return;
    setError('');
    if (!selectedClass || !selected) { setError('Chọn lớp và buổi học.'); return; }
    if (!changes.length) { setError('Chưa có thay đổi để lưu. Chọn Có mặt hoặc Vắng cho học viên.'); return; }
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
      if (!failed.length) { onSaved(); return; }
      // Keep only the marks that failed so the coach can retry them; saved ones now come from the server.
      const failedIds = new Set(failed.map(item => item.memberId));
      records.reload();
      setMarks(current => Object.fromEntries(Object.entries(current).filter(([memberId]) => failedIds.has(memberId))));
      setError(`Lưu được ${changes.length - failed.length}/${changes.length} học viên. Chưa lưu: ${failed.map(item => item.message).join('; ')}`);
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  async function saveSingle() {
    if (pending.current || !initial) return;
    setError('');
    const memberId = referenceId(initial.memberId);
    if (!selectedClass || !selected) { setError('Không tìm thấy buổi học của bản điểm danh này.'); return; }
    pending.current = true; setBusy(true);
    try {
      const { current, confirmed } = await freshSession();
      if (!confirmed.has(memberId)) throw new Error('Học viên không còn trong danh sách đã xác nhận của lớp.');
      await attendancesApi.update(token, entityId(initial), { memberId, classId, lessonId: referenceId(current.lessonId), date: dayOf(current.date), status });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  const classDays = data && classId ? [...new Set(classSessions(data.schedules, classId).map(item => dayOf(item.date)))] : [];

  return (
    <div className="stack">
      <p className="body">Chọn lớp và ngày để xem lịch dạy, rồi điểm danh cả lớp trong một lần lưu.</p>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {data && (
        <>
          <section className="card">
            <h2 className="heading">1. Lớp tôi phụ trách</h2>
            <div className="chip-row">
              {data.classes.map(item => (
                <Button key={entityId(item)} small secondary={classId !== entityId(item)} disabled={locked}
                  title={`${String(item.name)} · ${referenceLabel(item.subjectId)}`}
                  onPress={() => { setClassId(entityId(item)); setDay(bangkokDate()); resetSession(); }} />
              ))}
            </div>
            {!data.classes.length && <p className="body">Bạn chưa được phân công lớp.</p>}
          </section>

          {selectedClass && (
            <section className="card">
              <h2 className="heading">2. Buổi học</h2>
              <div className="row-actions align-end">
                <Field label="Ngày học" type="date" value={day} editable={!locked} onChangeText={value => { setDay(value); resetSession(); }} hint={formatDateLabel(day) || undefined} />
                <Button secondary small title="Hôm nay" disabled={locked} onPress={() => { setDay(bangkokDate()); resetSession(); }} />
              </div>
              {classDays.length > 0 && (
                <div className="stack-xs">
                  <span className="body small">Ngày có lịch của lớp</span>
                  <div className="chip-row">
                    {classDays.map(value => <Button key={value} small secondary={value !== day} disabled={locked} title={`${value.slice(8, 10)}/${value.slice(5, 7)}`} onPress={() => { setDay(value); resetSession(); }} />)}
                  </div>
                </div>
              )}
              <div className="chip-row">
                {sessions.map(item => (
                  <Button key={entityId(item)} small secondary={!selected || entityId(selected) !== entityId(item)} disabled={locked}
                    title={`${String(item.startTime)}–${String(item.endTime)} · ${referenceLabel(item.lessonId)} · ${referenceLabel(item.roomId)}`}
                    onPress={() => { setScheduleId(entityId(item)); setMarks({}); }} />
                ))}
              </div>
              {!sessions.length && <p className="body">Không có lịch dạy của lớp này vào ngày đã chọn.</p>}
            </section>
          )}

          {selected && (
            <section className="card">
              <div className="row-between">
                <div>
                  <h2 className="heading">3. Danh sách học viên</h2>
                  <p className="body small">{referenceLabel(selected.lessonId)} · {formatDateLabel(dayOf(selected.date))} · {String(selected.startTime)}–{String(selected.endTime)} · Phòng {referenceLabel(selected.roomId)}</p>
                </div>
                {!initial && students.length > 0 && (
                  <Button small secondary title="Tất cả có mặt" disabled={busy || records.loading}
                    onPress={() => setMarks(Object.fromEntries(students.map(item => [entityId(item), 'PRESENT'])))} />
                )}
              </div>
              <QueryStatus loading={records.loading} error={records.error} retry={records.reload} />

              {initial ? (
                <>
                  <ul className="roll-list">
                    {students.filter(item => entityId(item) === referenceId(initial.memberId)).map(item => (
                      <StudentRow key={entityId(item)} student={item} index={0} saved={saved[entityId(item)]?.status} value={status} disabled={busy} onMark={setStatus} />
                    ))}
                  </ul>
                  <div><Button disabled={busy} title={busy ? 'Đang lưu…' : 'Lưu điểm danh'} onPress={saveSingle} /></div>
                </>
              ) : (
                <>
                  {students.length > 0 && (
                    <p className="body small">{students.length} học viên · {counts.present} có mặt · {counts.absent} vắng · {counts.unmarked} chưa điểm danh</p>
                  )}
                  <ul className="roll-list">
                    {students.map((item, index) => (
                      <StudentRow key={entityId(item)} student={item} index={index} saved={saved[entityId(item)]?.status}
                        value={currentStatus(entityId(item), saved, marks)} changed={changes.some(change => change.memberId === entityId(item))}
                        disabled={busy || records.loading || !!records.error}
                        onMark={value => setMarks(current => ({ ...current, [entityId(item)]: value }))} />
                    ))}
                  </ul>
                  {!students.length && <p className="body">Chưa có học viên đã xác nhận (đã thanh toán) trong lớp.</p>}
                  {students.length > 0 && (
                    <div>
                      <Button disabled={busy || records.loading || !!records.error || !changes.length}
                        title={busy ? 'Đang lưu…' : changes.length ? `Lưu điểm danh (${changes.length} học viên)` : 'Chưa có thay đổi'} onPress={saveRollCall} />
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}

function StudentRow({ student, index, saved, value, changed = false, disabled, onMark }) {
  const name = String(student.fullName || 'Chưa có tên');
  return (
    <li className={`roll-row${changed ? ' is-changed' : ''}`}>
      <div className="roll-info">
        <strong>{index + 1}. {name}</strong>
        <span className="body small">
          {student.phone ? String(student.phone) : 'Chưa có số điện thoại'}
          {saved ? ` · Đã lưu: ${statusText[saved] || saved}` : ' · Chưa điểm danh'}
          {changed ? ' · chưa lưu thay đổi' : ''}
        </span>
      </div>
      <div className="roll-actions" role="group" aria-label={`Điểm danh ${name}`}>
        <Button small secondary={value !== 'PRESENT'} aria-pressed={value === 'PRESENT'} disabled={disabled} title="Có mặt" onPress={() => onMark('PRESENT')} />
        <Button small secondary={value !== 'ABSENT'} aria-pressed={value === 'ABSENT'} disabled={disabled} title="Vắng" className={value === 'ABSENT' ? 'btn-absent' : ''} onPress={() => onMark('ABSENT')} />
      </div>
    </li>
  );
}
