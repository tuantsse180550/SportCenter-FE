import { entityId, referenceId } from '../api/operations';

/** Registrations (PENDING_PAYMENT/CONFIRMED) of the coach's classes, newest first. */
export function buildCoachRoster(registrations, classes, coachId) {
  if (!coachId) return [];
  const ownClasses = new Map(classes.filter(item => referenceId(item.coachId) === coachId).map(item => [entityId(item), item]));
  return registrations.flatMap(record => {
    const classInfo = ownClasses.get(referenceId(record.classId));
    const memberId = referenceId(record.memberId);
    if (!classInfo || !memberId || !['PENDING_PAYMENT', 'CONFIRMED'].includes(String(record.status))) return [];
    const member = record.memberId && typeof record.memberId === 'object' ? record.memberId : undefined;
    return [{ id: entityId(record) || `${entityId(classInfo)}:${memberId}`, memberId, member, class: classInfo, status: record.status, registeredAt: record.registeredAt || record.createdAt }];
  }).sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));
}

/**
 * GET /api/coaches/my-students rows ({ member, class, registeredAt }, confirmed only) → registration
 * records, so buildCoachRoster can use them like /api/class-registrations (which COACH may not read).
 */
export function studentsAsRegistrations(students) {
  return (Array.isArray(students) ? students : []).map(row => ({
    classId: row.class,
    memberId: row.member,
    status: row.status || 'CONFIRMED',
    registeredAt: row.registeredAt,
  }));
}

export function coachStudentName(item) {
  const name = item.member?.fullName;
  return typeof name === 'string' && name.trim() ? name.trim() : 'Chưa tải được tên hội viên';
}
