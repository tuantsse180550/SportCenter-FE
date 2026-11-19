import { request, enc } from './client';

/** Every YYYY-MM-DD from `from` to `to`, inclusive. */
function datesBetween(from, to) {
  const days = [];
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += 86400000) days.push(new Date(time).toISOString().slice(0, 10));
  return days;
}

/**
 * Team report (GET /api/reports/overview, grouped by day in Asia/Ho_Chi_Minh) → the shape the
 * dashboard and report page use: { summary, daily[], undatedSuccessfulPayments }. Days without
 * activity are filled with zeros so charts keep one bar per day.
 */
export function toManagerReport(overview, from, to) {
  const byPeriod = rows => new Map((rows || []).map(row => [row.period, row]));
  const members = byPeriod(overview.members?.series);
  const registrations = byPeriod(overview.registrations?.series);
  const revenue = byPeriod(overview.revenue?.series);
  const daily = datesBetween(from, to).map(date => ({
    date,
    newMembers: members.get(date)?.count || 0,
    registrations: registrations.get(date)?.count || 0,
    successfulPayments: revenue.get(date)?.transactions || 0,
    revenue: revenue.get(date)?.total || 0,
  }));
  return {
    summary: {
      totalMembers: overview.members?.total || 0,
      newMembers: overview.members?.newInPeriod || 0,
      registrations: overview.registrations?.byStatusInPeriod || {},
      revenue: overview.revenue?.total || 0,
      classRevenue: overview.revenue?.classes || 0,
      membershipRevenue: overview.revenue?.memberships || 0,
      successfulPayments: daily.reduce((sum, day) => sum + day.successfulPayments, 0),
    },
    daily,
    undatedSuccessfulPayments: 0,
  };
}

// CENTER_MANAGER APIs (SportCenter-BE /api/manager, see MANAGER_API.md).
export const managerApi = {
  /**
   * from/to: YYYY-MM-DD (inclusive, ≤ 366 days). Uses the team report endpoint; the range is sent
   * as whole days in UTC+7 so a payment made after midnight in Vietnam counts on the right day.
   */
  report: async (token, from, to) => {
    const overview = await request(`/api/reports/overview?from=${enc(`${from}T00:00:00+07:00`)}&to=${enc(`${to}T23:59:59.999+07:00`)}&groupBy=day`, { token });
    return toManagerReport(overview, from, to);
  },
  plans: token => request('/api/manager/membership-plans', { token }),
  createPlan: (token, input) => request('/api/manager/membership-plans', { token, body: input }),
  updatePlan: (token, id, input) => request(`/api/manager/membership-plans/${enc(id)}`, { token, method: 'PATCH', body: input }),
  /** Member profile id → current membership { planName, startsAt, expiresAt, status } or null. */
  membership: (token, memberId) => request(`/api/manager/members/${enc(memberId)}/membership`, { token }),
  assignMembership: (token, memberId, planId) => request(`/api/manager/members/${enc(memberId)}/membership`, { token, body: { planId } }),
  /** expectedExpiresAt must be the expiresAt string from membership() (optimistic check). */
  renewMembership: (token, memberId, planId, expectedExpiresAt) => request(`/api/manager/members/${enc(memberId)}/membership/renew`, { token, body: { planId, expectedExpiresAt } }),
  /** → { accessKeys: ['classes:read', …], roles: [{ role, disabled: [] }] } */
};

export const configurableRoleLabels = { MEMBER: 'Hội viên', COACH: 'Huấn luyện viên', RECEPTIONIST: 'Lễ tân' };

export const accessResourceLabels = {
  members: 'Hồ sơ hội viên', coaches: 'Huấn luyện viên', subjects: 'Môn thể thao', classes: 'Lớp học',
  'class-registrations': 'Đăng ký lớp', attendances: 'Điểm danh', 'workout-plans': 'Kế hoạch tập luyện',
  'workout-results': 'Kết quả tập luyện', notifications: 'Thông báo', 'support-requests': 'Yêu cầu hỗ trợ',
  payments: 'Thanh toán', schedules: 'Lịch tập', courses: 'Khóa học', 'learning-paths': 'Lộ trình học',
  lessons: 'Bài học', 'lesson-progress': 'Tiến độ bài học', rooms: 'Phòng tập', homeworks: 'Bài tập về nhà',
};

/** Days between two ISO dates (inclusive). */
export const daysInclusive = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
