// Coach roll call by day: when a session can be marked, how far it is marked, and each student's recent record.
import { referenceId } from '../api/operations';
import { dayOf } from './coach-teaching';
import { addDays } from './schedule-time';

export const OPEN_BEFORE_MINUTES = 15;
export const EDITABLE_DAYS = 7;

/** Bangkok wall clock "YYYY-MM-DD" + "HH:mm" → epoch ms. */
export const at = (day, time) => Date.parse(`${day}T${time}:00+07:00`);
const hhmm = ms => new Date(ms + 7 * 3600000).toISOString().slice(11, 16);

/**
 * phase: 'cancelled' | 'upcoming' (not open yet) | 'live' (in class) | 'ended' (still editable) | 'expired' (read only).
 * Marking opens 15 minutes before the start and stays editable for 7 days after the session day.
 */
export function sessionWindow(session, now) {
  const day = dayOf(session.date);
  const start = at(day, String(session.startTime));
  const end = at(day, String(session.endTime));
  const opens = start - OPEN_BEFORE_MINUTES * 60000;
  const closes = at(addDays(day, EDITABLE_DAYS), '23:59');
  if (session.status === 'CANCELLED') return { phase: 'cancelled', editable: false, label: 'Buổi học đã hủy' };
  if (now < opens) return { phase: 'upcoming', editable: false, opensAt: hhmm(opens), label: `Mở điểm danh lúc ${hhmm(opens)}` };
  if (now < end) {
    const left = Math.max(0, Math.ceil((end - now) / 60000));
    return { phase: 'live', editable: true, progress: Math.min(1, Math.max(0, (now - start) / (end - start))), label: now < start ? `Sắp bắt đầu lúc ${session.startTime}` : `Đang diễn ra · còn ${left} phút` };
  }
  if (now <= closes) return { phase: 'ended', editable: true, label: 'Đã kết thúc' };
  return { phase: 'expired', editable: false, label: `Quá ${EDITABLE_DAYS} ngày, chỉ xem` };
}

/** Attendance records of one session (same class, lesson and day) → memberId → status. */
export function sessionMarks(session, attendances) {
  const classId = referenceId(session.classId);
  const lessonId = referenceId(session.lessonId);
  const day = dayOf(session.date);
  const marks = new Map();
  for (const item of attendances) {
    if (referenceId(item.classId) === classId && referenceId(item.lessonId) === lessonId && dayOf(item.date) === day) {
      marks.set(referenceId(item.memberId), String(item.status));
    }
  }
  return marks;
}

/** How many confirmed students of the session are marked. */
export function sessionProgress(session, attendances, studentIds) {
  const marks = sessionMarks(session, attendances);
  const marked = studentIds.filter(id => marks.has(id));
  return {
    total: studentIds.length,
    marked: marked.length,
    present: marked.filter(id => marks.get(id) === 'PRESENT').length,
    absent: marked.filter(id => marks.get(id) === 'ABSENT').length,
    complete: studentIds.length > 0 && marked.length === studentIds.length,
  };
}

/**
 * A student's last sessions in this class before `day` (oldest → newest), plus streaks.
 * → { recent: ['PRESENT'|'ABSENT'], presentStreak, absentStreak, total, present }
 */
export function memberHistory(memberId, classId, attendances, day) {
  const rows = attendances
    .filter(item => referenceId(item.memberId) === memberId && referenceId(item.classId) === classId && dayOf(item.date) < day)
    .sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)))
    .map(item => String(item.status));
  const streak = status => {
    let count = 0;
    for (let index = rows.length - 1; index >= 0 && rows[index] === status; index -= 1) count += 1;
    return count;
  };
  return {
    recent: rows.slice(-5),
    presentStreak: streak('PRESENT'),
    absentStreak: streak('ABSENT'),
    total: rows.length,
    present: rows.filter(status => status === 'PRESENT').length,
  };
}

/** Monday of the week containing `day`. */
export const weekStart = day => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
