import { apiClient } from "../../api/apiClient.js";
import { ApiError } from "../../api/apiClient.js";
import * as normalize from "./normalize.js";
function record(value, normalizer, path) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !normalize.idOf(value)) {
    throw new ApiError("Invalid record response for " + path, { code: "INVALID_RESPONSE" });
  }
  return normalizer(value);
}
// Contracts verified from local BE routers/controllers; deployment parity is separate.
function resource(path, normalizer, fields, { create = true, update = true, remove = false, createFields = fields, updateFields = fields } = {}) {
  const url = "/api/" + path;
  return {
    async list() { const rows = await apiClient(url); if (!Array.isArray(rows)) throw new ApiError("Invalid list response for " + path, { code: "INVALID_RESPONSE" }); return rows.map(row => record(row, normalizer, path)); },
    ...(create ? { async create(input) { return record(await apiClient(url, { method: "POST", body: normalize.pick(input, createFields) }), normalizer, path); } } : {}),
    ...(update ? { async update(id, input) { return record(await apiClient(url + "/" + encodeURIComponent(id), { method: "PUT", body: normalize.pick(input, updateFields) }), normalizer, path); } } : {}),
    ...(remove ? { remove(id) { return apiClient(url + "/" + encodeURIComponent(id), { method: "DELETE" }); } } : {}),
  };
}
export const memberApi = resource("members", normalize.person, ["userId", "fullName", "phone", "goal", "level"], { remove: true, updateFields: ["fullName", "phone", "goal", "level"] });
export const memberProfileApi = {
  async frontDesk(input) {
    const data = await apiClient("/api/members/front-desk", { method: "POST", body: normalize.pick(input, ["email", "password", "fullName", "phone", "goal", "level"]) });
    if (data?.user?.role !== "MEMBER" || normalize.idOf(data.member?.userId) !== data.user.id) throw new ApiError("Phản hồi tạo tài khoản không hợp lệ. Vui lòng kiểm tra trước khi thử lại.", { code: "INVALID_RESPONSE" });
    return record(data.member, normalize.person, "members/front-desk");
  },
  async get() { return record(await apiClient("/api/members/me"), normalize.person, "members/me"); },
  async create(input) { return record(await apiClient("/api/members/me", { method: "POST", body: normalize.pick(input, ["fullName", "phone", "goal", "level"]) }), normalize.person, "members/me"); },
  async update(input) { return record(await apiClient("/api/members/me", { method: "PUT", body: normalize.pick(input, ["fullName", "phone", "goal", "level"]) }), normalize.person, "members/me"); },
};
export const coachApi = {
  ...resource("coaches", normalize.coach, ["userId", "fullName", "phone", "subjectIds"], { remove: true, updateFields: ["fullName", "phone", "subjectIds"] }),
  async myStudents() {
    const rows = await apiClient("/api/coaches/my-students");
    if (!Array.isArray(rows)) throw new ApiError("Invalid coach students response", { code: "INVALID_RESPONSE" });
    // This endpoint returns confirmed registrations for the authenticated coach's classes only.
    return rows.map(row => {
      const member = record(row?.member, normalize.person, "coaches/my-students");
      const classId = normalize.idOf(row?.class);
      if (!classId) throw new ApiError("Invalid coach student class response", { code: "INVALID_RESPONSE" });
      return { classId, className: row.class?.name, memberId: member.id, member, status: "CONFIRMED", registeredAt: row.registeredAt };
    });
  },
  async createAccount(input) {
    const data = await apiClient("/api/coaches/accounts", { method: "POST", body: normalize.pick(input, ["email", "password", "fullName", "phone", "subjectIds"]) });
    if (!data?.user?.id || data.user.role !== "COACH" || normalize.idOf(data.coach?.userId) !== data.user.id) {
      throw new ApiError("Tài khoản có thể đã được tạo nhưng phản hồi không hợp lệ. Vui lòng kiểm tra danh sách HLV trước khi thử lại.", { code: "INVALID_RESPONSE" });
    }
    return { user: data.user, coach: record(data.coach, normalize.coach, "coaches/accounts") };
  },
};
export const subjectApi = resource("subjects", normalize.entity, ["name"], { remove: true });
export const courseApi = resource("courses", normalize.course, ["subjectId", "name", "description", "price", "status"], { remove: true });
export const roomApi = {
  ...resource("rooms", normalize.entity, ["roomNumber", "name", "capacity", "status"], { remove: true }),
  async get(id) { return record(await apiClient("/api/rooms/" + encodeURIComponent(id)), normalize.entity, "rooms"); },
};
export const learningPathApi = {
  ...resource("learning-paths", normalize.entity, ["courseId", "name", "description"], { remove: true }),
  async apply(id, classId, expectedLessons) {
    const rows = await apiClient("/api/learning-paths/" + encodeURIComponent(id) + "/apply", { method: "POST", body: { classId, expectedLessons } });
    if (!Array.isArray(rows)) throw new ApiError("Invalid class curriculum response", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.entity, "learning-paths/apply"));
  },
};
export const classApi = resource("classes", normalize.classItem, ["name", "subjectId", "courseId", "coachId"], { remove: true });
export const registrationApi = resource("class-registrations", normalize.registration, ["classId", "memberId", "status"], { createFields: ["classId", "memberId"] });
export const scheduleApi = {
  generateClass(input) { return apiClient("/api/schedules/generate", { method: "POST", body: input }); },
  async importExcel(file) {
    if (!file || !/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024 || file.size === 0) throw new ApiError("Chọn file .xlsx không rỗng, tối đa 5 MB.", { status: 400 });
    const body = new FormData();
    body.append("file", file);
    return apiClient("/api/schedules/import", { method: "POST", body });
  },
  async coachMy() {
    const rows = await apiClient("/api/schedules/coach/my");
    if (!Array.isArray(rows)) throw new ApiError("Invalid coach schedule response", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.schedule, "schedules/coach/my"));
  },
  ...resource("schedules", normalize.schedule, ["classId", "lessonId", "roomId", "date", "startTime", "endTime", "status"], { remove: true }),
  async my() {
    const rows = await apiClient("/api/schedules/my");
    if (!Array.isArray(rows)) throw new ApiError("Invalid list response for schedules/my", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.schedule, "schedules/my"));
  },
};
export const attendanceApi = {
  async my() {
    const rows = await apiClient("/api/attendances/my");
    if (!Array.isArray(rows)) throw new ApiError("Invalid personal attendance response", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.attendance, "attendances/my"));
  },
  ...resource("attendances", normalize.attendance, ["memberId", "classId", "lessonId", "date", "status"], { remove: true }),
  async forSchedule(id) {
    const rows = await apiClient("/api/attendances/schedule/" + encodeURIComponent(id));
    if (!Array.isArray(rows)) throw new ApiError("Invalid attendance response", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.attendance, "attendances/schedule"));
  },
  async createForCoach(input) {
    return record(await apiClient("/api/attendances/coach", { method: "POST", body: normalize.pick(input, ["memberId", "scheduleId", "status"]) }), normalize.attendance, "attendances/coach");
  },
};
export const workoutPlanApi = resource("workout-plans", normalize.workoutPlan, ["coachId", "memberId", "classId", "goal", "level", "plan", "source", "status"], { remove: true });
export const workoutResultApi = resource("workout-results", normalize.workoutResult, ["workoutPlanId", "memberId", "scheduleId", "result", "comment"], { updateFields: ["result", "comment"] });
export const paymentApi = {
  recordOffline(id) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/record-payment", { method: "POST", body: {} }); },
  verifyReturn(query, { signal } = {}) { return apiClient("/api/payments/vnpay/verify-return", { method: "POST", body: query, signal }); },
  status(id, { signal } = {}) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/status", { signal }); },
  ...resource("payments", normalize.payment, ["classRegistrationId", "paymentMethod"]),
  receipt(id, { signal } = {}) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/receipt", { signal, responseType: "html" }); },
  simulate(id, status) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/simulate", { method: "POST", body: { status } }); },
  vnpay(id) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/vnpay", { method: "POST" }); },
};
export const activityLogApi = resource("activity-logs", normalize.entity, ["action"], { update: false });
export const notificationApi = {
  ...resource("notifications", normalize.entity, ["userId", "title", "message", "isRead"], { createFields: ["userId", "title", "message"], updateFields: ["isRead"] }),
  async my() { const rows = await apiClient("/api/notifications/my"); if (!Array.isArray(rows)) throw new ApiError("Invalid notification response"); return rows.map(normalize.entity); },
};
export const supportRequestApi = {
  ...resource("support-requests", normalize.entity, ["memberId", "message"], { update: false }),
  async update(id, input) { return record(await apiClient("/api/support-requests/" + encodeURIComponent(id) + "/status", { method: "PUT", body: normalize.pick(input, ["status", "note"]) }), normalize.entity, "support-requests/status"); },
};
export const homeworkApi = {
  async my() { const rows = await apiClient("/api/homeworks/my"); if (!Array.isArray(rows)) throw new ApiError("Invalid homework response"); return rows.map(normalize.entity); },
  create(input) { return apiClient("/api/homeworks", { method: "POST", body: normalize.pick(input, ["classId", "memberId", "title", "description", "dueDate", "attachments"]) }); },
};
export const staffApi = {
  async list() { const rows = await apiClient("/api/staff/accounts"); if (!Array.isArray(rows)) throw new ApiError("Invalid account response"); return rows.map(normalize.entity); },
  create(input) { return apiClient("/api/staff/accounts", { method: "POST", body: normalize.pick(input, ["email", "password", "role", "fullName", "phone", "subjectId"]) }); },
  async update(id, input) { return record(await apiClient("/api/staff/accounts/" + encodeURIComponent(id), { method: "PUT", body: normalize.pick(input, ["fullName", "phone", "status"]) }), normalize.entity, "staff/accounts"); },
};
export const reportApi = {
  summary({ from, to } = {}) { const params = new URLSearchParams(); if (from) params.set("from", from); if (to) params.set("to", to); return apiClient("/api/reports/summary" + (params.size ? "?" + params : "")); },
};
export const lessonApi = {
  ...resource("lessons", normalize.entity, ["classId", "learningPathId", "title", "description", "order"], { remove: true }),
  async templates() {
    const rows = await apiClient("/api/lessons?templates=true");
    if (!Array.isArray(rows)) throw new ApiError("Invalid template lessons response", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.entity, "lessons/templates"));
  },
  async forClass(id) {
    const rows = await apiClient("/api/lessons/class/" + encodeURIComponent(id));
    if (!Array.isArray(rows)) throw new ApiError("Invalid class lessons response", { code: "INVALID_RESPONSE" });
    return rows.map(row => record(row, normalize.entity, "lessons/class"));
  },
};
export const lessonProgressApi = resource("lesson-progress", normalize.entity, ["memberId", "lessonId", "classId", "status"], { updateFields: ["status", "coachComment"] });
