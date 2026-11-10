import { classApi, registrationApi, scheduleApi, coachApi, subjectApi, courseApi } from "./resources.js";
import { ApiError } from "../../api/apiClient.js";
import { classTuition } from "../../utils/classTuition.js";
export const coachService = { listCoaches: () => coachApi.list() };
export const classService = {
  // Member catalog metadata does not require the staff-only registration list.
  listMemberClasses: () => classApi.list(),
  async getMemberClassDetail(id) {
    const detail = (await classApi.list()).find(item => item.id === id);
    if (!detail) return null;
    return { ...detail, coursePrice: classTuition(detail) };
  },
  async getMemberClassSessions(id) {
    return (await scheduleApi.list()).filter(session => session.classId === id)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  },
  async listClasses(filters = {}) {
    const [classes, registrations, sessions] = await Promise.all([classApi.list(), registrationApi.list(), scheduleApi.list()]);
    return classes.map((item) => ({ ...item, enrolledCount: registrations.filter((r) => r.classId === item.id && r.status === "CONFIRMED").length,
      pendingCount: registrations.filter((r) => r.classId === item.id && r.status === "PENDING_PAYMENT").length,
      schedule: sessions.filter((s) => s.classId === item.id).map((s) => s.date + " " + s.startTime).join(", ") || "No sessions scheduled" }))
      .filter((item) => (!filters.query || [item.name, item.sport, item.coach?.name].join(" ").toLowerCase().includes(filters.query.toLowerCase())) && (!filters.subjectId || item.subjectId === filters.subjectId) && (!filters.coachId || item.coachId === filters.coachId));
  },
  async getClassDetail(id) {
    const [classes, registrations, sessions, courses] = await Promise.all([classApi.list(), registrationApi.list(), scheduleApi.list(), courseApi.list()]);
    const item = classes.find((row) => row.id === id);
    if (!item) return null;
    const rows = registrations.filter((r) => r.classId === id);
    return { ...item, course: courses.find(c => c.id === item.courseId) || item.course, registrations: rows, enrolledMembers: rows.filter((r) => r.status === "CONFIRMED").map((r) => r.member).filter(Boolean), enrolledCount: rows.filter((r) => r.status === "CONFIRMED").length, sessions: sessions.filter((s) => s.classId === id) };
  },
  async getFormOptions() { const [coaches, subjects, courses, classes] = await Promise.all([coachApi.list(), subjectApi.list(), courseApi.list(), classApi.list()]); return { coaches, subjects, courses, classes }; },
  createClass: (input) => classApi.create(input),
  deleteClass: (id) => classApi.remove(id),
  updateClass: (id, input) => classApi.update(id, input),
  async assignCoach(id, coachId) { const item = (await classApi.list()).find((row) => row.id === id); if (!item) throw new ApiError("Class not found", { status: 404 }); return classApi.update(id, { ...item, coachId }); },
  registerMember(classId, memberId) { if (!memberId) throw new ApiError("A member profile is required. Please contact reception."); return registrationApi.create({ classId, memberId }); },
};
