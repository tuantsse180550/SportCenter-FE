import { entityId, referenceId } from '../api/operations';

export const teachingResources = ['subjects', 'courses', 'learning-paths', 'lessons'];

/** Limit subjects/courses/paths/lessons to what the coach's classes use. */
export function scopeTeachingResources(resource, records, classes, paths) {
  const subjectIds = new Set(classes.map(item => referenceId(item.subjectId)));
  const courseIds = new Set(classes.map(item => referenceId(item.courseId)));
  const pathIds = new Set(paths.filter(item => courseIds.has(referenceId(item.courseId))).map(entityId));
  if (resource === 'subjects') return records.filter(item => subjectIds.has(entityId(item)));
  if (resource === 'courses') return records.filter(item => courseIds.has(entityId(item)));
  if (resource === 'learning-paths') return records.filter(item => courseIds.has(referenceId(item.courseId)));
  if (resource === 'lessons') return records.filter(item => pathIds.has(referenceId(item.learningPathId)));
  return records;
}

export const dayOf = value => (typeof value === 'string' ? value.slice(0, 10) : '');

export function classSessions(schedules, classId, day) {
  return schedules
    .filter(item => referenceId(item.classId) === classId && item.status !== 'CANCELLED' && (!day || dayOf(item.date) === day))
    .sort((a, b) => `${dayOf(a.date)} ${a.startTime}`.localeCompare(`${dayOf(b.date)} ${b.startTime}`));
}

/** Confirmed members of a class from /api/coaches/my-students rows. */
export function attendanceMembers(students, classId) {
  return students.filter(row => referenceId(row.class) === classId).map(row => row.member).filter(item => !!item && typeof item === 'object');
}

/** Unique member objects from my-students rows (optionally for one class). */
export function studentMembers(rows, classId = '') {
  const members = new Map();
  for (const row of rows) {
    if (classId && referenceId(row.class) !== classId) continue;
    const member = row.member && typeof row.member === 'object' ? row.member : undefined;
    if (member && entityId(member) && !members.has(entityId(member))) members.set(entityId(member), member);
  }
  return [...members.values()];
}
