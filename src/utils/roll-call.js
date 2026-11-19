// Roll call for one scheduled session: merge saved attendance with the coach's new marks.
// Same rules as the mobile app (src/utils/roll-call.ts).
import { entityId, referenceId } from '../api/operations';

/** memberId → { id, status } of the saved attendance record for this session. */
export function savedAttendance(records) {
  return Object.fromEntries(records
    .map(item => [referenceId(item.memberId), { id: entityId(item), status: String(item.status) }])
    .filter(([memberId]) => !!memberId));
}

/** Status shown for a student: the coach's new mark, else what is already saved. */
export const currentStatus = (memberId, saved, marks) => marks[memberId] || saved[memberId]?.status || '';

/** Only students whose mark differs from what is saved: new records are created, saved ones updated. */
export function rollCallChanges(students, records, marks) {
  const saved = savedAttendance(records);
  return students.flatMap(student => {
    const memberId = entityId(student);
    const status = marks[memberId];
    if (!memberId || !status || saved[memberId]?.status === status) return [];
    return [{ memberId, name: String(student.fullName || ''), status, ...(saved[memberId] ? { recordId: saved[memberId].id } : {}) }];
  });
}

export function rollCallCounts(students, records, marks) {
  const saved = savedAttendance(records);
  const statuses = students.map(student => currentStatus(entityId(student), saved, marks));
  return {
    present: statuses.filter(status => status === 'PRESENT').length,
    absent: statuses.filter(status => status === 'ABSENT').length,
    unmarked: statuses.filter(status => !status).length,
  };
}
