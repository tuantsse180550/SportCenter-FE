import { classesApi, coachesApi, learningPathsApi, schedulesApi, entityId, referenceId } from '../api/operations';

/** The coach's own classes + all learning paths (for lesson scoping). */
export async function loadTeachingScope(token, coachId) {
  if (!coachId) throw new Error('Chưa có hồ sơ huấn luyện viên.');
  const [classes, paths] = await Promise.all([classesApi.list(token), learningPathsApi.list(token)]);
  return { classes: classes.filter(item => referenceId(item.coachId) === coachId), paths };
}

/** Everything the coach attendance form needs, scoped to the coach's classes. */
export async function loadCoachAttendanceContext(token) {
  const [coach, classes, schedules, students] = await Promise.all([coachesApi.me(token), classesApi.list(token), schedulesApi.coachMy(token), coachesApi.myStudents(token)]);
  const coachId = entityId(coach);
  if (!coachId) throw new Error('Chưa có hồ sơ huấn luyện viên.');
  const ownClasses = classes.filter(item => referenceId(item.coachId) === coachId);
  const classIds = new Set(ownClasses.map(entityId));
  return {
    classes: ownClasses,
    schedules: schedules.filter(item => classIds.has(referenceId(item.classId))),
    students: students.filter(item => classIds.has(referenceId(item.class))),
  };
}
