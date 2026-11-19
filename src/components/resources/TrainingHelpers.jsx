import { useCallback, useState } from 'react';
import { useApiQuery } from '../../hooks/useApiQuery';
import { coachesApi, entityId, referenceId, referenceLabel, schedulesApi } from '../../api/operations';
import { loadPlanSuggestion } from '../../api/plan-suggest';
import { dayOf } from '../../utils/coach-teaching';
import { bangkokDate } from '../../utils/url';
import Button from '../common/Button';
import ChoiceGroup from '../common/ChoiceGroup';
import QueryStatus from '../common/QueryStatus';

/** Workout plan for one student or the whole class (the BE accepts exactly one of them). */
export function PlanTargetPicker({ value, onChange, disabled }) {
  return (
    <ChoiceGroup label="Kế hoạch cho" disabled={disabled} value={value} onChange={onChange}
      options={[{ value: 'member', label: 'Một học viên' }, { value: 'class', label: 'Cả lớp' }]} />
  );
}

/** Builds an exercise plan from goal, level, sport and history; the coach reviews it before saving. */
export function PlanSuggestion({ token, values, disabled, onApply }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const forClass = values.planTarget === 'class';
  const ready = forClass ? !!values.classId : !!values.memberId;

  async function suggest() {
    setBusy(true); setError(''); setNote('');
    try {
      const result = await loadPlanSuggestion(token, { ...(forClass ? { classId: values.classId } : { memberId: values.memberId }), goal: values.goal, level: values.level });
      onApply({
        plan: values.plan?.trim() ? `${values.plan.trim()}\n\n--- Gợi ý ---\n${result.text}` : result.text,
        ...(!values.goal?.trim() && result.memberGoal ? { goal: result.memberGoal } : {}),
        ...(result.memberLevel ? { level: result.memberLevel } : {}),
      });
      setNote(`Đã điền gợi ý (trọng tâm: ${result.focus.join(', ')}). Xem lại và chỉnh trước khi lưu.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="suggest-box stack-sm">
      <h3 className="heading-sm">Gợi ý bài tập</h3>
      <p className="body small">Dựa trên mục tiêu, trình độ, môn của lớp và lịch sử tập (kết quả, điểm danh) của học viên. Gợi ý được tạo theo quy tắc ngay trên trình duyệt.</p>
      <div>
        <Button secondary small disabled={disabled || busy || !ready}
          title={busy ? 'Đang tạo gợi ý…' : ready ? 'Gợi ý bài tập →' : forClass ? 'Chọn lớp để gợi ý' : 'Chọn học viên để gợi ý'} onPress={suggest} />
      </div>
      {note && <p role="status" className="success">{note}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}

/** Past sessions (≤ today) of the member's classes, to tag a workout result with its session. */
export function ResultSessionPicker({ token, memberId, value, onChange, disabled }) {
  const load = useCallback(async () => {
    const [schedules, students] = await Promise.all([schedulesApi.coachMy(token), coachesApi.myStudents(token)]);
    const classIds = new Set(students.filter(row => referenceId(row.member) === memberId).map(row => referenceId(row.class)));
    const today = bangkokDate();
    return schedules
      .filter(item => classIds.has(referenceId(item.classId)) && item.status !== 'CANCELLED' && dayOf(item.date) <= today)
      .sort((a, b) => `${dayOf(b.date)} ${b.startTime}`.localeCompare(`${dayOf(a.date)} ${a.startTime}`))
      .slice(0, 6);
  }, [token, memberId]);
  const query = useApiQuery(load, !!memberId);
  if (!memberId) return null;
  const labelOf = item => `Buổi ${dayOf(item.date).split('-').reverse().join('/')} ${String(item.startTime)}–${String(item.endTime)} · ${referenceLabel(item.lessonId)}`;
  return (
    <div className="field">
      <span className="field-label">Buổi tập (tùy chọn)</span>
      <p className="body small">Chọn buổi vừa dạy để kết quả ghi rõ thuộc buổi nào.</p>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      <div className="chip-row">
        {query.data?.map(item => {
          const label = labelOf(item);
          return <Button key={entityId(item)} small secondary={value !== label} aria-pressed={value === label} disabled={disabled}
            title={`${dayOf(item.date).slice(8, 10)}/${dayOf(item.date).slice(5, 7)} ${String(item.startTime)} · ${referenceLabel(item.lessonId)}`}
            onPress={() => onChange(value === label ? '' : label)} />;
        })}
      </div>
      {query.data?.length === 0 && <p className="body small">Chưa có buổi đã dạy của học viên này.</p>}
    </div>
  );
}
