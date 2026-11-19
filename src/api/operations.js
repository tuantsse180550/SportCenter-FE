import { request, enc } from './client';
import { roomsApi } from './rooms';

// Mongo documents may come back with `id` or `_id`.
export const entityId = entity => entity?.id || entity?._id || '';

/** A reference field may be a raw id string or a populated object. */
export function referenceId(value) {
  return typeof value === 'string' ? value : value && typeof value === 'object' ? entityId(value) : '';
}

export function referenceLabel(value) {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : 'Chưa có';
  return String(value.name || value.title || value.fullName || value.email || value.goal || entityId(value) || 'Chưa có');
}

function pick(input, keys) {
  return Object.fromEntries(
    keys
      .filter(key => input[key] !== undefined && !(key === 'classId' && input[key] === ''))
      .map(key => [key, typeof input[key] === 'string' ? input[key].trim() : input[key]]),
  );
}

function crud(path, keys, updateKeys = keys) {
  return {
    list: token => request(path, { token }),
    create: (token, input) => request(path, { token, body: pick(input, keys) }),
    update: (token, id, input) => request(`${path}/${enc(id)}`, { token, method: 'PUT', body: pick(input, updateKeys) }),
    remove: (token, id) => request(`${path}/${enc(id)}`, { token, method: 'DELETE' }),
  };
}

export const coachesApi = {
  ...crud('/api/coaches', ['userId', 'fullName', 'phone', 'subjectId'], ['fullName', 'phone']),
  me: token => request('/api/coaches/me', { token }),
  updateMe: (token, input) => request('/api/coaches/me', { token, method: 'PATCH', body: pick(input, ['fullName', 'phone']) }),
  myStudents: token => request('/api/coaches/my-students', { token }),
};

export const subjectsApi = crud('/api/subjects', ['name']);

export const coursesApi = crud('/api/courses', ['subjectId', 'name', 'description', 'price', 'status', 'imageUrl']);

/** Tuition per student, with a fallback for older course records. */
export function coursePrice(course) {
  const price = course?.price ?? course?.pricing?.group;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : undefined;
}

export const lessonsApi = {
  ...crud('/api/lessons', ['classId', 'learningPathId', 'title', 'description', 'order', 'videoUrl']),
  byClass: (token, classId) => request(`/api/lessons/class/${enc(classId)}`, { token }),
};

export const schedulesApi = {
  ...crud('/api/schedules', ['classId', 'lessonId', 'roomId', 'date', 'startTime', 'endTime', 'status']),
  my: token => request('/api/schedules/my', { token }),
  coachMy: token => request('/api/schedules/coach/my', { token }),
};

export const activityLogsApi = {
  list: token => request('/api/activity-logs', { token }),
  create: (token, input) => request('/api/activity-logs', { token, body: pick(input, ['userId', 'action']) }),
};

// classType is not sent: every class is a group class (BE default GROUP).
export const classesApi = crud('/api/classes', ['name', 'subjectId', 'courseId', 'coachId']);

const registrationCrud = crud('/api/class-registrations', ['classId', 'memberId'], ['classId', 'memberId', 'status']);
export const classRegistrationsApi = { list: registrationCrud.list, create: registrationCrud.create, update: registrationCrud.update };

export const attendancesApi = {
  ...crud('/api/attendances', ['memberId', 'classId', 'lessonId', 'date', 'status']),
  my: token => request('/api/attendances/my', { token }),
  // COACH marks attendance for a schedule of their own class.
  coachCreate: (token, memberId, scheduleId, status) => request('/api/attendances/coach', { token, body: { memberId, scheduleId, status } }),
  bySchedule: (token, scheduleId) => request(`/api/attendances/schedule/${enc(scheduleId)}`, { token }),
};

export const learningPathsApi = crud('/api/learning-paths', ['courseId', 'name', 'description']);

// Create needs classId (taken from the lesson); update may only send status / coachComment.
const progressCrud = crud('/api/lesson-progress', ['memberId', 'lessonId', 'classId', 'status'], ['status', 'coachComment']);
export const lessonProgressApi = { list: progressCrud.list, create: progressCrud.create, update: progressCrud.update };

export const workoutPlansApi = crud('/api/workout-plans', ['coachId', 'memberId', 'classId', 'goal', 'level', 'plan', 'source', 'status']);

const resultCrud = crud('/api/workout-results', ['workoutPlanId', 'memberId', 'result', 'comment']);
export const workoutResultsApi = { list: resultCrud.list, create: resultCrud.create, update: resultCrud.update };

/** Resource key (used in /workspace/:resource) → API module. */
export const resourceApis = {
  rooms: roomsApi,
  coaches: coachesApi,
  schedules: schedulesApi,
  'activity-logs': activityLogsApi,
  subjects: subjectsApi,
  courses: coursesApi,
  lessons: lessonsApi,
  classes: classesApi,
  'class-registrations': classRegistrationsApi,
  attendances: attendancesApi,
  'learning-paths': learningPathsApi,
  'lesson-progress': lessonProgressApi,
  'workout-plans': workoutPlansApi,
  'workout-results': workoutResultsApi,
};
