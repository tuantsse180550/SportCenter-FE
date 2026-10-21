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
  async get() { return record(await apiClient("/api/members/me"), normalize.person, "members/me"); },
  async create(input) { return record(await apiClient("/api/members/me", { method: "POST", body: normalize.pick(input, ["fullName", "phone", "goal", "level"]) }), normalize.person, "members/me"); },
  async update(input) { return record(await apiClient("/api/members/me", { method: "PUT", body: normalize.pick(input, ["fullName", "phone", "goal", "level"]) }), normalize.person, "members/me"); },
};
export const coachApi = resource("coaches", normalize.person, ["userId", "fullName", "phone"], { remove: true, updateFields: ["fullName", "phone"] });
export const subjectApi = resource("subjects", normalize.entity, ["name"], { remove: true });
export const courseApi = resource("courses", normalize.entity, ["name", "description", "price", "status"], { remove: true });
export const roomApi = {
  ...resource("rooms", normalize.entity, ["roomNumber", "name", "capacity", "status"], { remove: true }),
  async get(id) { return record(await apiClient("/api/rooms/" + encodeURIComponent(id)), normalize.entity, "rooms"); },
};
export const learningPathApi = resource("learning-paths", normalize.entity, ["courseId", "name", "description"], { remove: true });
export const classApi = resource("classes", normalize.classItem, ["name", "subjectId", "courseId", "coachId"], { remove: true });
export const registrationApi = resource("class-registrations", normalize.registration, ["classId", "memberId", "status"], { createFields: ["classId", "memberId"] });
export const scheduleApi = {
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
export const workoutResultApi = resource("workout-results", normalize.workoutResult, ["workoutPlanId", "memberId", "result", "comment"], { updateFields: ["result", "comment"] });
export const paymentApi = {
  ...resource("payments", normalize.payment, ["classRegistrationId", "paymentMethod"]),
  simulate(id, status) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/simulate", { method: "POST", body: { status } }); },
  vnpay(id) { return apiClient("/api/payments/" + encodeURIComponent(id) + "/vnpay", { method: "POST" }); },
};
export const activityLogApi = resource("activity-logs", normalize.entity, ["userId", "action"], { update: false });
export const notificationApi = resource("notifications", normalize.entity, ["userId", "title", "message", "isRead"], { createFields: ["userId", "title", "message"], updateFields: ["isRead"] });
export const supportRequestApi = resource("support-requests", normalize.entity, ["memberId", "message", "status"], { createFields: ["memberId", "message"], updateFields: ["status"] });
export const lessonApi = resource("lessons", normalize.entity, ["learningPathId", "title", "description", "order"], { remove: true });
export const lessonProgressApi = resource("lesson-progress", normalize.entity, ["memberId", "lessonId", "classId", "status"], { updateFields: ["status", "coachComment"] });
