import { memberApi, coachApi, classApi, paymentApi, registrationApi, activityLogApi, attendanceApi } from "./resources.js";
import { idOf } from "./normalize.js";
export const reportService = {
  async getAttendanceReport() { const [rows, classes] = await Promise.all([attendanceApi.list(), classApi.list()]); return { rows, classes }; },
  async getAuditLog() { return (await activityLogApi.list()).map((row) => ({ ...row, actor: row.userId?.email || idOf(row.userId) })); },
  async getDashboard() { const [members, coaches, classes, payments, registrations, logs] = await Promise.all([memberApi.list(), coachApi.list(), classApi.list(), paymentApi.list(), registrationApi.list(), this.getAuditLog()]); return { totalMembers: members.length, coaches: coaches.length, classes: classes.length, revenue: payments.filter((p) => p.status === "SUCCESS").reduce((n, p) => n + p.amount, 0), registrations: registrations.filter((r) => r.status === "CONFIRMED").length, pendingPayments: registrations.filter((r) => r.status === "PENDING_PAYMENT").length, recentActivities: logs.slice(0, 5) }; },
  async getReports() { const [classes, payments, registrations, members] = await Promise.all([classApi.list(), paymentApi.list(), registrationApi.list(), memberApi.list()]); return { classes: classes.map((c) => ({ label: c.name, value: registrations.filter((r) => r.classId === c.id && r.status === "CONFIRMED").length })), payments, revenueRows: payments.filter((p) => p.status === "SUCCESS"), totalMembers: members.length }; },
};
