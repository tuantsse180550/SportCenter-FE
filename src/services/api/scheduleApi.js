import { scheduleApi, registrationApi, attendanceApi, workoutPlanApi, coachApi } from "./resources.js";
import { ApiError } from "../../api/apiClient.js";
import { authService } from "./authApi.js";
import { matchesAttendanceSession, coachAttendanceSession } from "./attendanceIdentity.js";
const withCounts = (sessions, registrations) => sessions.map((s) => ({ ...s, memberCount: registrations.filter((r) => r.classId === s.classId && r.status === "CONFIRMED").length }));
export const scheduleService = {
  async getCoachSessions(coachId) { if (!coachId) throw new ApiError("Coach profile is missing. Please contact the center manager."); const [sessions, registrations] = await Promise.all([scheduleApi.coachMy(), coachApi.myStudents()]); return withCounts(sessions.filter((s) => s.coachId === coachId), registrations); },
  async getMemberSchedule(memberId) {
    if (!memberId) throw new ApiError("Member profile is missing. Please contact reception.");
    const current = authService.getCurrentUser();
    const self = current?.role === "MEMBER" && current.memberId === memberId;
    if (current?.role === "MEMBER") {
      if (!self) throw new ApiError("You cannot access another member's schedule.", { status: 403 });
      // BE /my returns only schedules for this JWT's CONFIRMED registrations.
      // It does not provide pending registrations or class-wide member counts.
      return (await scheduleApi.my())
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        .map(session => ({ ...session, registrationStatus: "CONFIRMED" }));
    }
    const [sessions, registrations] = await Promise.all([scheduleApi.list(), registrationApi.list()]);
    const own = registrations.filter((r) => r.memberId === memberId && r.status !== "CANCELLED");
    let visible = sessions.filter((s) => own.some((r) => r.classId === s.classId));
    visible.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    return withCounts(visible, registrations).map((s) => ({ ...s, registrationStatus: own.find((r) => r.classId === s.classId)?.status }));
  },
  async getSessionDetail(id) {
    if (authService.getCurrentUser()?.role === "MEMBER") throw new ApiError("Attendance lookup for members is not supported securely.", { code: "UNSUPPORTED_MEMBER_ATTENDANCE" });
    const isCoach = authService.getCurrentUser()?.role === "COACH";
    const sessions = await (isCoach ? scheduleApi.coachMy() : scheduleApi.list());
    const item = sessions.find((s) => s.id === id); if (!item) return null;
    const user = authService.getCurrentUser();
    if (user?.role === "COACH" && (!user.coachId || item.coachId !== user.coachId)) throw new ApiError("You are not assigned to this session.", { status: 403 });
    const identity = isCoach ? coachAttendanceSession(item) : item;
    const [registrations, attendance, plans] = await Promise.all([isCoach ? coachApi.myStudents() : registrationApi.list(), isCoach ? attendanceApi.forSchedule(id) : attendanceApi.list(), workoutPlanApi.list()]);
    const members = registrations.filter(r => r.classId === item.classId && r.status === "CONFIRMED").map(r => r.member).filter(Boolean);
    return { ...item, attendanceDateTime: identity.dateTime, attendanceAmbiguous: sessions.filter(s => matchesAttendanceSession(isCoach ? coachAttendanceSession(s) : s, identity)).length > 1, members, attendance: attendance.filter(a => matchesAttendanceSession(a, identity)), plans: plans.filter(p => p.classId === item.classId || (!p.classId && members.some(m => m.id === p.memberId))) };
  },
  async getCoachScheduleSummary(coachId) { const sessions = await this.getCoachSessions(coachId); const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()); return { sessions, today: sessions.filter((s) => s.date === today), upcoming: sessions.filter((s) => s.status === "SCHEDULED"), completed: sessions.filter((s) => s.status === "COMPLETED"), memberCount: sessions.reduce((total, s) => total + s.memberCount, 0) }; },
};
