import { buildCoachRoster } from '../utils/coach-roster';
import { coachRegistrations } from './coach-roster';
import { bangkokDate, bangkokTime } from '../utils/url';
import { membersApi } from '../api/members';
import { paymentsApi } from '../api/payments';
import { activityLogsApi, classRegistrationsApi, classesApi, coachesApi, schedulesApi, workoutPlansApi, workoutResultsApi, entityId, referenceId } from '../api/operations';

/** Pure summary so it can be tested without network. role: 'COACH' | 'CENTER_MANAGER'. */
export function summarizeDashboard(role, userId, data, now = new Date()) {
  const today = bangkokDate(now);
  const coach = data.coaches?.find(item => referenceId(item.userId) === userId);
  if (role === 'COACH' && !coach) throw new Error('Tài khoản chưa có hồ sơ huấn luyện viên hoặc không tải được hồ sơ. Liên hệ quản lý nếu bạn chưa có hồ sơ.');
  const coachId = coach ? entityId(coach) : '';
  const classes = role === 'COACH' ? data.classes?.filter(item => referenceId(item.coachId) === coachId) : data.classes;
  const classIds = new Set(classes?.map(entityId));
  const schedules = role === 'COACH' ? data.classes && data.schedules?.filter(item => classIds.has(referenceId(item.classId))) : data.schedules;
  const plans = role === 'COACH' ? data.plans?.filter(item => referenceId(item.coachId) === coachId) : data.plans;
  const enrollments = role === 'COACH' ? buildCoachRoster(data.registrations || [], data.classes || [], coachId) : [];
  const students = new Set(enrollments.map(item => item.memberId));

  // Revenue = sum of SUCCESS payments (manager only).
  const paid = (data.payments || []).filter(item => item.status === 'SUCCESS');
  const month = today.slice(0, 7);
  const revenue = data.payments ? paid.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : null;
  const revenueMonth = data.payments ? paid.filter(item => String(item.paymentDate || item.updatedAt || item.createdAt || '').slice(0, 7) === month).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : null;

  const metrics = role === 'CENTER_MANAGER' ? [
    { label: 'Hội viên', value: data.members?.length ?? null, path: '/members' },
    { label: 'Huấn luyện viên', value: data.coaches?.length ?? null, path: '/workspace/coaches' },
    { label: 'Lớp học', value: classes?.length ?? null, path: '/workspace/classes' },
    { label: 'Đăng ký chờ thanh toán', value: data.registrations?.filter(item => item.status === 'PENDING_PAYMENT').length ?? null, path: '/workspace/class-registrations' },
  ] : [
    { label: 'Buổi dạy hôm nay', value: schedules?.filter(item => String(item.date).slice(0, 10) === today && item.status !== 'CANCELLED').length ?? null, path: '/workspace/schedules' },
    { label: 'Lớp phụ trách', value: classes?.length ?? null, path: '/workspace/classes' },
    { label: 'Học viên đăng ký', value: data.registrations && classes ? students.size : null, path: '/coach-students' },
    { label: 'Kế hoạch bản nháp', value: plans?.filter(item => item.status === 'DRAFT').length ?? null, path: '/workspace/workout-plans' },
  ];

  const time = bangkokTime(now);
  const sessions = (schedules || [])
    .filter(item => { const day = String(item.date).slice(0, 10); return item.status === 'SCHEDULED' && (day > today || (day === today && String(item.startTime) >= time)); })
    .sort((a, b) => `${String(a.date).slice(0, 10)} ${a.startTime}`.localeCompare(`${String(b.date).slice(0, 10)} ${b.startTime}`))
    .slice(0, 5);
  const ownPlanIds = new Set(plans?.map(entityId));
  const activity = role === 'CENTER_MANAGER'
    ? (data.logs || []).slice(0, 5)
    : (data.results || []).filter(item => ownPlanIds.has(referenceId(item.workoutPlanId))).slice(0, 5);
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.parse(`${today}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
    return { day, count: schedules?.filter(item => String(item.date).slice(0, 10) === day && item.status !== 'CANCELLED').length ?? null };
  });
  const registrationStats = data.registrations ? ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'].map(status => ({ status, count: data.registrations.filter(item => item.status === status).length })) : null;

  return {
    enrollments, today, metrics, sessions, activity, week, registrationStats,
    schedules: schedules || [], classes: classes || [], members: data.members || null, plans: plans || null,
    revenue, revenueMonth,
    name: role === 'COACH' ? String(coach.fullName || 'Coach') : 'Quản lý',
  };
}

export async function loadDashboard(role, userId, token) {
  const sources = [
    ['coaches', 'Huấn luyện viên', async () => (role === 'COACH' ? [await coachesApi.me(token)] : coachesApi.list(token))],
    ['classes', 'Lớp học', () => classesApi.list(token)],
    ['schedules', 'Lịch tập', () => (role === 'COACH' ? schedulesApi.coachMy(token) : schedulesApi.list(token))],
    // COACH may not list /class-registrations; their students come from /coaches/my-students.
    ['registrations', 'Đăng ký lớp', () => (role === 'COACH' ? coachRegistrations(token) : classRegistrationsApi.list(token))],
    ...(role === 'CENTER_MANAGER' ? [
      ['members', 'Hội viên', () => membersApi.list(token)],
      ['logs', 'Lịch sử thao tác', () => activityLogsApi.list(token)],
      ['payments', 'Thanh toán', () => paymentsApi.list(token)],
    ] : [
      ['plans', 'Kế hoạch tập', () => workoutPlansApi.list(token)],
      ['results', 'Kết quả tập', () => workoutResultsApi.list(token)],
    ]),
  ];
  // One failing source must not blank the whole dashboard.
  const results = await Promise.allSettled(sources.map(async ([, , load]) => {
    const items = await load();
    if (!Array.isArray(items)) throw new Error('Danh sách không hợp lệ.');
    return items;
  }));
  const data = {};
  const errors = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') data[sources[index][0]] = result.value;
    else errors.push(`${sources[index][1]}: ${result.reason instanceof Error ? result.reason.message : 'Không tải được dữ liệu.'}`);
  });
  return { ...summarizeDashboard(role, userId, data), errors };
}
