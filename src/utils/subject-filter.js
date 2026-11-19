import { classesApi, coursesApi, entityId, learningPathsApi, referenceId, subjectsApi } from '../api/operations';

/** Lists whose records belong to one sport (môn), so they can be filtered by it. */
export const SUBJECT_RESOURCES = [
  'courses', 'learning-paths', 'lessons', 'classes', 'schedules', 'class-registrations',
  'attendances', 'lesson-progress', 'workout-plans', 'workout-results', 'coaches',
];

const settle = promise => promise.then(items => (Array.isArray(items) ? items : [])).catch(() => []);

/**
 * Lookup tables to find the sport of any record. Each list loads on its own; one the role
 * cannot read simply leaves its links empty (those records then count as "Khác").
 */
export async function loadSubjectIndex(token) {
  const [subjects, classes, courses, paths] = await Promise.all([
    settle(subjectsApi.list(token)), settle(classesApi.list(token)), settle(coursesApi.list(token)), settle(learningPathsApi.list(token)),
  ]);
  const courseSubject = new Map(courses.map(item => [entityId(item), referenceId(item.subjectId)]));
  const classSubject = new Map(classes.map(item => [entityId(item), referenceId(item.subjectId) || courseSubject.get(referenceId(item.courseId)) || '']));
  const coachSubject = new Map(classes.map(item => [referenceId(item.coachId), classSubject.get(entityId(item))]));
  const pathSubject = new Map(paths.map(item => [entityId(item), courseSubject.get(referenceId(item.courseId)) || '']));
  const names = new Map(subjects.map(item => [entityId(item), String(item.name || '')]));
  return { names, courseSubject, classSubject, coachSubject, pathSubject };
}

/** Sport id of a record ('' when unknown). Works with populated or plain id references. */
export function subjectOf(resource, item, index) {
  if (!item || !index) return '';
  const fromClass = value => {
    if (value && typeof value === 'object' && value.subjectId) return referenceId(value.subjectId);
    return index.classSubject.get(referenceId(value)) || '';
  };
  switch (resource) {
    case 'courses': return referenceId(item.subjectId);
    case 'coaches': return referenceId(item.subjectId);
    case 'classes': return referenceId(item.subjectId) || index.courseSubject.get(referenceId(item.courseId)) || '';
    case 'learning-paths': return index.courseSubject.get(referenceId(item.courseId)) || '';
    case 'lessons': return fromClass(item.classId) || index.pathSubject.get(referenceId(item.learningPathId)) || '';
    case 'workout-plans': return fromClass(item.classId) || index.coachSubject.get(referenceId(item.coachId)) || '';
    case 'workout-results': {
      const plan = item.workoutPlanId && typeof item.workoutPlanId === 'object' ? item.workoutPlanId : null;
      return plan ? (fromClass(plan.classId) || index.coachSubject.get(referenceId(plan.coachId)) || '') : '';
    }
    default: return fromClass(item.classId);
  }
}

/** [{ id, name, count }] for the sports present in `records`, most used first; '' collects the unknown ones. */
export function subjectCounts(resource, records, index) {
  const counts = new Map();
  for (const item of records) {
    const id = subjectOf(resource, item, index);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count, name: id ? index?.names.get(id) || 'Môn khác' : 'Chưa rõ môn' }))
    .sort((a, b) => (a.id === '') - (b.id === '') || b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}

/** Stable colour per sport, used by chips and grouped sections. */
const TONES = ['orange', 'purple', 'green', 'blue'];
export const subjectTone = (id, ids) => TONES[Math.max(0, ids.indexOf(id)) % TONES.length];
