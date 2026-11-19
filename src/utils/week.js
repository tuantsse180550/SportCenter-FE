// Week helpers for the weekly timetable. Pure (no imports) so node --test can load them.
// Dates are ISO "YYYY-MM-DD" calendar days; weeks run Monday → Sunday.

const addDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/** Monday of the week that contains `iso`. */
export const mondayOf = iso => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
/** The 7 days Monday → Sunday starting at `monday`. */
export const weekDays = monday => Array.from({ length: 7 }, (_, index) => addDays(monday, index));
/** `monday` moved by whole weeks (-1 = previous week). */
export const shiftWeek = (monday, weeks) => addDays(monday, weeks * 7);
/** Sessions of one week grouped per day (Monday first), each day in start-time order. */
export function weekTimetable(sessions, monday) {
  const days = weekDays(monday);
  const byDay = new Map(days.map(day => [day, []]));
  for (const item of sessions || []) byDay.get(String(item?.date || '').slice(0, 10))?.push(item);
  return days.map(day => ({ day, sessions: byDay.get(day).sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))) }));
}

const idOf = value => (typeof value === 'string' ? value : value && typeof value === 'object' ? String(value._id || value.id || '') : '');
const dayOf = value => String(value || '').slice(0, 10);

/**
 * The member's attendance records indexed for the timetable. A record has no schedule id, so it is
 * matched by class + lesson + day (the unique key on the server), and by class + day as a fallback.
 */
export function attendanceIndex(records) {
  const index = new Map();
  for (const record of records || []) {
    if (!['PRESENT', 'ABSENT'].includes(record?.status)) continue;
    const classId = idOf(record.classId);
    const day = dayOf(record.date);
    if (!classId || !day) continue;
    index.set(`${classId}|${idOf(record.lessonId)}|${day}`, record.status);
    if (!index.has(`${classId}||${day}`)) index.set(`${classId}||${day}`, record.status);
  }
  return index;
}
/** 'PRESENT' | 'ABSENT' | '' (not marked) for one session. */
export function attendanceOf(index, session) {
  const classId = idOf(session?.classId);
  const day = dayOf(session?.date);
  return index?.get(`${classId}|${idOf(session?.lessonId)}|${day}`) || index?.get(`${classId}||${day}`) || '';
}
