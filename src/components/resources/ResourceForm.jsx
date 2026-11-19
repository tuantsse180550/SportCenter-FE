import { useCallback, useRef, useState } from 'react';
import VideoEmbed from '../common/VideoEmbed';
import ClassCover from '../common/ClassCover';
import { VIDEO_HINT } from '../../utils/video';
import Button from '../common/Button';
import Field from '../common/Field';
import ChoiceGroup from '../common/ChoiceGroup';
import QueryStatus from '../common/QueryStatus';
import RelationField from '../common/RelationField';
import CoachAttendanceForm from '../attendance/CoachAttendanceForm';
import { initialValues, resources, validateResource } from '../../utils/resources';
import { classesApi, coachesApi, lessonsApi, learningPathsApi, referenceId, referenceLabel } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import { loadTeachingScope } from '../../services/coach-teaching';
import { scopeTeachingResources, studentMembers } from '../../utils/coach-teaching';
import { assertCoachAssignment } from '../../utils/role-workflows';
import { addDays, addMinutes, commonStartTimes, cycleLessons, defaultRepeat, durationLabel, formatDateLabel, isTime, plannedDates, repeatCount, sessionLengths } from '../../utils/schedule-time';
import { bangkokDate } from '../../utils/url';
import ScheduleRepeat from './ScheduleRepeat';
import { PlanSuggestion, PlanTargetPicker, ResultSessionPicker } from './TrainingHelpers';
import { withSessionNote } from '../../utils/exercise-suggest';

const inputType = { date: 'date', time: 'time', number: 'number', money: 'number', phone: 'tel', video: 'url', image: 'url' };

/** Generic create/edit form driven by utils/resources definitions. */
export default function ResourceForm(props) {
  if (props.resource === 'attendances' && props.role === 'COACH') {
    return <CoachAttendanceForm token={props.token} initial={props.initial} defaults={props.defaults} onSaved={props.onSaved} />;
  }
  return <GenericResourceForm {...props} />;
}

function GenericResourceForm({ resource, initial, token, userId, role, actorId, defaults, onSave, onSaved }) {
  // Sport name of a course, for its default cover illustration.
  const [coverSubject, setCoverSubject] = useState(() => (initial?.subjectId && typeof initial.subjectId === 'object' ? referenceLabel(initial.subjectId) : ''));
  const [values, setValues] = useState(() => ({
    ...initialValues(resource, initial),
    ...defaults,
    ...(role === 'MEMBER' && actorId ? { memberId: actorId } : {}),
    ...(role === 'COACH' && resource === 'workout-plans' && actorId ? { coachId: actorId } : {}),
    ...(resource === 'activity-logs' ? { userId } : {}),
    ...(resource === 'workout-plans' ? { planTarget: initial && referenceId(initial.classId) && !referenceId(initial.memberId) ? 'class' : 'member' } : {}),
  }));
  const [sessionNote, setSessionNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const scopeLoad = useCallback(() => loadTeachingScope(token, actorId || ''), [token, actorId]);
  const teaching = useApiQuery(scopeLoad, role === 'COACH' && resource === 'lesson-progress');
  const [repeat, setRepeat] = useState(defaultRepeat);
  const [report, setReport] = useState(null); // { created, failed: [{ date, message }] }
  const repeating = resource === 'schedules' && !initial && repeat.enabled;
  const result = validateResource(resource, values, !!initial);
  const change = (key, value) => setValues(current => {
    const next = { ...current, [key]: value };
    // A start time proposes a 60-minute session unless a later end time is already set.
    if (resource === 'schedules' && key === 'startTime' && isTime(value) && (!current.endTime || current.endTime <= value)) next.endTime = addMinutes(value, 60);
    return next;
  });

  // One schedule per planned date; continues past errors (e.g. room conflicts) and reports them.
  async function saveRepeated() {
    const dates = plannedDates(values.date, repeat);
    if (!dates.length || !repeatCount(repeat)) throw new Error('Chọn ngày bắt đầu, các ngày trong tuần và số buổi (1–52).');
    const lessons = repeat.advanceLesson ? cycleLessons(await lessonsApi.byClass(token, values.classId), values.lessonId, dates.length) : dates.map(() => values.lessonId);
    const outcome = { created: 0, failed: [] };
    for (const [index, date] of dates.entries()) {
      try { await onSave({ ...result.payload, date, lessonId: lessons[index] }); outcome.created++; }
      catch (e) { outcome.failed.push({ date, message: e instanceof Error ? e.message : 'Không lưu được.' }); }
    }
    if (outcome.failed.length) setReport(outcome);
    else onSaved();
  }

  async function save(event) {
    event.preventDefault();
    if (pending.current || report) return;
    setSubmitted(true); setError('');
    if (Object.keys(result.errors).length) return;
    pending.current = true; setBusy(true);
    if (repeating) {
      try { await saveRepeated(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được lịch.'); }
      finally { pending.current = false; setBusy(false); }
      return;
    }
    try {
      // Coaches may only assign their own classes / confirmed students.
      const assignmentChanged = resource !== 'workout-plans' || !initial || values.memberId !== referenceId(initial.memberId) || values.classId !== referenceId(initial.classId);
      if (role === 'COACH' && ['attendances', 'lesson-progress', 'workout-plans'].includes(resource) && assignmentChanged) {
        const [classes, students] = await Promise.all([classesApi.list(token), coachesApi.myStudents(token)]);
        assertCoachAssignment(values, actorId || '', classes, students);
        if (resource === 'lesson-progress') {
          const [lessons, paths] = await Promise.all([lessonsApi.list(token), learningPathsApi.list(token)]);
          const ownClasses = classes.filter(item => referenceId(item.coachId) === actorId);
          if (!scopeTeachingResources('lessons', lessons, ownClasses, paths).some(item => referenceId(item) === values.lessonId)) throw new Error('Chọn bài học thuộc khóa học bạn phụ trách.');
        }
      }
      await onSave(resource === 'workout-results' && !initial ? { ...result.payload, result: withSessionNote(String(result.payload.result || ''), sessionNote) } : result.payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được dữ liệu.');
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  function relationFilter(field) {
    if (role === 'COACH' && field.key === 'lessonId') return item => !!teaching.data && scopeTeachingResources('lessons', [item], teaching.data.classes, teaching.data.paths).length > 0;
    if (role === 'COACH' && field.key === 'classId') return item => referenceId(item.coachId) === actorId;
    if (field.key === 'roomId') return item => item.status === 'ACTIVE' || referenceId(item) === values.roomId;
    if (field.key === 'workoutPlanId') {
      // Results are always for one member, so class-wide plans cannot be chosen here.
      return item => !!referenceId(item.memberId) && (role === 'MEMBER' ? referenceId(item.memberId) === actorId : role === 'COACH' ? referenceId(item.coachId) === actorId : true);
    }
    return undefined;
  }

  const fields = resources[resource].fields
    .filter(field => (!initial || !field.createOnly) && (initial || !field.updateOnly))
    // Plans target one member OR one class; members never edit the coach's comment.
    .filter(field => !(resource === 'workout-plans' && (values.planTarget === 'class' ? field.key === 'memberId' : field.key === 'classId')))
    .filter(field => !(role === 'MEMBER' && field.key === 'coachComment'));
  return (
    <form className="card stack" onSubmit={save} noValidate>
      {role === 'COACH' && resource === 'lesson-progress' && <QueryStatus loading={teaching.loading} error={teaching.error} retry={teaching.reload} />}
      {resource === 'workout-plans' && (
        <PlanTargetPicker value={values.planTarget} disabled={busy}
          onChange={value => setValues(current => ({ ...current, planTarget: value, memberId: value === 'class' ? '' : current.memberId, classId: value === 'member' ? '' : current.classId }))} />
      )}
      {fields.map(field => {
        const fieldError = submitted ? result.errors[field.key] : undefined;
        const locked = (role === 'MEMBER' && field.key === 'memberId') || (role === 'COACH' && resource === 'workout-plans' && field.key === 'coachId') || (resource === 'workout-results' && field.key === 'memberId');
        if (locked) {
          return (
            <div key={field.key} className="field">
              <span className="field-label">{field.label}</span>
              <p className="body">{field.key === 'memberId' && resource === 'workout-results' ? 'Hội viên được lấy từ kế hoạch tập đã chọn.' : 'Hồ sơ của tài khoản đang đăng nhập.'}</p>
              {fieldError && <p className="error">{fieldError}</p>}
            </div>
          );
        }
        if (field.relation) {
          const coachStudents = role === 'COACH' && field.key === 'memberId';
          return (
            <RelationField
              key={field.key}
              label={field.label}
              path={coachStudents ? '/api/coaches/my-students' : field.relation}
              transformItems={coachStudents ? rows => studentMembers(rows, values.classId) : undefined}
              token={token}
              value={values[field.key]}
              initialLabel={initial?.[field.key] && typeof initial[field.key] === 'object' ? referenceLabel(initial[field.key]) : undefined}
              onChange={value => change(field.key, value)}
              disabled={busy || (role === 'COACH' && field.key === 'lessonId' && !teaching.data && resource === 'lesson-progress')}
              error={fieldError}
              optional={!field.required}
              filter={relationFilter(field)}
              onSelect={field.key === 'workoutPlanId' ? item => change('memberId', referenceId(item.memberId))
                : resource === 'lesson-progress' && field.key === 'lessonId' ? item => setValues(current => ({ ...current, classId: referenceId(item.classId), memberId: role === 'MEMBER' ? current.memberId : '' }))
                  : resource === 'courses' && field.key === 'subjectId' ? item => setCoverSubject(String(item.name || ''))
                    : undefined}
            />
          );
        }
        if (field.options) {
          return <ChoiceGroup key={field.key} label={field.label} options={field.options} value={values[field.key]} onChange={value => change(field.key, value)} disabled={busy} error={fieldError} />;
        }
        if (field.type === 'date') {
          const today = bangkokDate();
          return (
            <div key={field.key} className="stack-xs">
              <Field label={field.label} type="date" value={values[field.key]} onChangeText={value => change(field.key, value)} editable={!busy && !report} error={fieldError}
                hint={formatDateLabel(values[field.key]) || undefined} />
              <div className="chip-row">
                {[['Hôm nay', 0], ['Ngày mai', 1], ['+1 tuần', 7]].map(([label, days]) => {
                  const day = addDays(today, days);
                  return <Button key={label} small secondary={values[field.key] !== day} disabled={busy || !!report} title={label} onPress={() => change(field.key, day)} />;
                })}
              </div>
            </div>
          );
        }
        if (field.type === 'image') {
          return (
            <div key={field.key} className="stack-xs">
              <Field label={field.label} type="url" placeholder="https://images.unsplash.com/…" value={values[field.key]} onChangeText={value => change(field.key, value)}
                editable={!busy} error={fieldError} hint="Dán link ảnh (https). Để trống thì dùng ảnh minh họa theo môn. Nên dùng ảnh ngang, tỉ lệ khoảng 16:9." />
              <div className="cover-preview">
                <ClassCover imageUrl={values[field.key]} subject={coverSubject} alt="Xem trước ảnh bìa" />
                <small>{values[field.key]?.trim() ? 'Xem trước ảnh bìa (nếu link lỗi sẽ hiện ảnh minh họa).' : 'Đang dùng ảnh minh họa theo môn.'}</small>
              </div>
            </div>
          );
        }
        if (field.type === 'video') {
          return (
            <div key={field.key} className="stack-xs">
              <Field label={field.label} type="url" placeholder="https://youtu.be/…" value={values[field.key]} onChangeText={value => change(field.key, value)}
                editable={!busy} error={fieldError} hint={VIDEO_HINT} />
              {values[field.key]?.trim() && (
                <VideoEmbed url={values[field.key]} title={`Xem trước: ${values.title || 'video bài học'}`}
                  fallback={<p className="body small">Chưa xem trước được: link chưa đúng dạng YouTube, Vimeo hoặc Google Drive.</p>} />
              )}
            </div>
          );
        }
        if (field.type === 'time') {
          const start = field.key === 'endTime' && isTime(values.startTime) ? values.startTime : '';
          const current = values[field.key];
          const picks = start
            ? sessionLengths.map(minutes => ({ time: addMinutes(start, minutes), label: `+${minutes}'` }))
            : commonStartTimes.map(time => ({ time, label: time }));
          return (
            <div key={field.key} className="stack-xs">
              <div className="row-actions align-end">
                <Button small secondary title="−15'" aria-label="Lùi 15 phút" disabled={busy || !!report || !isTime(current)} onPress={() => change(field.key, addMinutes(current, -15))} />
                <div className="grow">
                  <Field label={field.label} type="time" value={current} onChangeText={value => change(field.key, value)} editable={!busy && !report} error={fieldError} />
                </div>
                <Button small secondary title="+15'" aria-label="Thêm 15 phút" disabled={busy || !!report || !isTime(current)} onPress={() => change(field.key, addMinutes(current, 15))} />
              </div>
              <div className="chip-row">
                {picks.map(pick => (
                  <Button key={pick.label} small secondary={current !== pick.time} disabled={busy || !!report || (!!start && pick.time <= start)}
                    title={start ? `${pick.time} (${pick.label})` : pick.time} onPress={() => change(field.key, pick.time)} />
                ))}
              </div>
              {start && isTime(current) && <p className="body small">{durationLabel(start, current) ? `Buổi học dài ${durationLabel(start, current)}` : 'Giờ kết thúc phải sau giờ bắt đầu.'}</p>}
            </div>
          );
        }
        return (
          <Field
            key={field.key}
            label={field.label}
            type={inputType[field.type] || 'text'}
            min={field.type === 'money' ? 0 : field.type === 'number' ? 1 : undefined}
            step={field.type === 'money' ? 1000 : undefined}
            value={values[field.key]}
            onChangeText={value => change(field.key, value)}
            editable={!busy}
            error={fieldError}
            multiline={field.type === 'multiline'}
          />
        );
      })}
      {resource === 'workout-plans' && role === 'COACH' && <PlanSuggestion token={token} values={values} disabled={busy} onApply={patch => setValues(current => ({ ...current, ...patch }))} />}
      {resource === 'workout-results' && !initial && role === 'COACH' && <ResultSessionPicker token={token} memberId={values.memberId} value={sessionNote} onChange={setSessionNote} disabled={busy} />}
      {resource === 'workout-results' && !initial && <p className="body small">Chỉ chọn được kế hoạch cá nhân: kết quả tập luôn ghi cho một học viên.</p>}
      {resource === 'schedules' && !initial && <ScheduleRepeat date={values.date} value={repeat} onChange={setRepeat} disabled={busy || !!report} />}
      {error && <p role="alert" className="error">{error}</p>}
      {report ? (
        <div className="stack-sm" role="alert">
          <p className={report.created ? 'success' : 'error'}>Đã tạo {report.created}/{report.created + report.failed.length} buổi.</p>
          {report.failed.map(item => <p key={item.date} className="error">{formatDateLabel(item.date)}: {item.message}</p>)}
          <p className="body small">Các buổi lỗi chưa được tạo. Sửa lại (ví dụ đổi phòng hoặc giờ) rồi thêm riêng từng buổi.</p>
          <div><Button title="Về danh sách lịch" onPress={onSaved} /></div>
        </div>
      ) : (
        <Button type="submit" disabled={busy} title={busy ? 'Đang lưu…' : repeating ? `Tạo ${plannedDates(values.date, repeat).length} buổi` : 'Lưu thông tin'} />
      )}
    </form>
  );
}
