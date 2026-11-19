import { coachesApi, classesApi, entityId } from '../api/operations';
import { buildCoachRoster, studentsAsRegistrations } from '../utils/coach-roster';

/** Registrations of the coach's own classes, from GET /api/coaches/my-students (the COACH-only API). */
export async function coachRegistrations(token) {
  return studentsAsRegistrations(await coachesApi.myStudents(token));
}

/** Students of the coach's classes with goal and level, newest first. */
export async function loadCoachRoster(token) {
  const [coach, classes, registrations] = await Promise.all([coachesApi.me(token), classesApi.list(token), coachRegistrations(token)]);
  const coachId = entityId(coach);
  if (!coachId) throw new Error('Không tải được hồ sơ huấn luyện viên.');
  if (!Array.isArray(classes)) throw new Error('Danh sách lớp từ máy chủ không hợp lệ.');
  return buildCoachRoster(registrations, classes, coachId);
}
