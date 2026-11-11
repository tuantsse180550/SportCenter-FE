import { classApi, activityLogApi, attendanceApi, reportApi } from "./resources.js";
import { idOf } from "./normalize.js";
export const reportService = {
 async getAttendanceReport() { const [rows, classes] = await Promise.all([attendanceApi.list(), classApi.list()]); return { rows, classes }; },
 async getAuditLog() { return (await activityLogApi.list()).map(row => ({ ...row, actor: row.userId?.email || idOf(row.userId) })); },
 async getDashboard() { const [data, logs] = await Promise.all([reportApi.summary(), this.getAuditLog()]); return { totalMembers: data.totals.members, activeMembers: data.totals.activeAccounts, courses: data.totals.courses, coaches: data.totals.coaches, classes: data.totals.classes, revenue: data.revenue.amount, registrations: data.registrations.CONFIRMED || 0, pendingPayments: data.registrations.PENDING_PAYMENT || 0, recentActivities: logs.slice(0, 5) }; },
 getReports: filters => reportApi.summary(filters),
};
