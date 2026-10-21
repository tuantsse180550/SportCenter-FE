// MongoDB's Date equality is an exact instant, not a local calendar day.
export function sessionAttendanceKey(value) {
  const date = value?.dateTime || value?.date;
  const instant = date ? new Date(date).getTime() : NaN;
  if (!value?.classId || !value?.lessonId || !Number.isFinite(instant)) return null;
  return JSON.stringify([value.classId, value.lessonId, instant]);
}
export function matchesAttendanceSession(record, session) {
  const key = sessionAttendanceKey(session);
  return key !== null && sessionAttendanceKey(record) === key;
}
// Coach schedule endpoints store the UTC calendar day at midnight.
export function coachAttendanceSession(session) {
  const date = new Date(session?.dateTime || session?.date);
  if (!Number.isFinite(date.getTime())) return { ...session, dateTime: null, date: null };
  date.setUTCHours(0, 0, 0, 0);
  return { ...session, dateTime: date.toISOString(), date: date.toISOString().slice(0, 10) };
}
