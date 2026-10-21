import { attendanceApi } from "./resources.js";
import { ApiError } from "../../api/apiClient.js";
import { authService } from "./authApi.js";
import { matchesAttendanceSession, sessionAttendanceKey, coachAttendanceSession } from "./attendanceIdentity.js";
import { attendanceWindow } from "../../utils/attendanceWindow.js";
function checkTime(session) {
  const window = attendanceWindow(session);
  if (!window.allowed) throw new ApiError(window.message, { code: window.code, status: 400 });
}
function checkWriteSession(session) {
  const user = authService.getCurrentUser();
  if (!["CENTER_MANAGER", "COACH", "RECEPTIONIST"].includes(user?.role)) throw new ApiError("Access denied", { status: 403 });
  if (user.role === "COACH" && (!user.coachId || session.coachId !== user.coachId)) throw new ApiError("You are not assigned to this session.", { status: 403 });
  if (!sessionAttendanceKey(session)) throw new ApiError("Invalid attendance session identity.", { status: 400 });
  if (session.attendanceAmbiguous) throw new ApiError("Attendance cannot distinguish these sessions.", { code: "AMBIGUOUS_ATTENDANCE" });
  checkTime(session);
}
export const attendanceService = {
  async getMyAttendance() { return attendanceApi.my(); },
  async saveAttendance(session, statuses) {
    checkWriteSession(session);
    for (const [memberId, status] of Object.entries(statuses)) {
      if (!["PRESENT", "ABSENT"].includes(status)) throw new ApiError("Attendance must be PRESENT or ABSENT.");
      if (!session.members.some(member => member.id === memberId)) throw new ApiError("Member is not in this session roster.", { status: 400 });
    }
    const isCoach = authService.getCurrentUser()?.role === "COACH";
    const identity = isCoach ? coachAttendanceSession(session) : session;
    const existing = await (isCoach ? attendanceApi.forSchedule(session.id) : attendanceApi.list());
    let saved = 0;
    try {
      for (const [memberId, status] of Object.entries(statuses)) {
        checkTime(session);
        if (!["PRESENT", "ABSENT"].includes(status)) throw new ApiError("Attendance must be PRESENT or ABSENT.");
        const payload = { memberId, classId: session.classId, lessonId: session.lessonId, date: identity.dateTime || identity.date, status };
        const matches = existing.filter(a => a.memberId === memberId && matchesAttendanceSession(a, identity));
        if (matches.length > 1) throw new ApiError("Attendance cannot distinguish these sessions.", { code: "AMBIGUOUS_ATTENDANCE" });
        const row = matches[0];
        if (row) await attendanceApi.update(row.id, payload);
        else if (isCoach) await attendanceApi.createForCoach({ memberId, scheduleId: session.id, status });
        else await attendanceApi.create(payload);
        saved += 1;
      }
      return { saved };
    } catch (error) { throw new ApiError(saved + " attendance records saved before the error. Retry to update remaining records. " + error.message, { status: error.status, code: error.code, details: error.details }); }
  },
  async deleteAttendance(session, memberId) {
    checkWriteSession(session);
    const isCoach = authService.getCurrentUser()?.role === "COACH";
    const identity = isCoach ? coachAttendanceSession(session) : session;
    const rows = (await (isCoach ? attendanceApi.forSchedule(session.id) : attendanceApi.list())).filter(a => a.memberId === memberId && matchesAttendanceSession(a, identity));
    if (!rows.length) throw new ApiError("Attendance not found", { status: 404 });
    if (rows.length > 1) throw new ApiError("Attendance cannot distinguish these sessions.", { code: "AMBIGUOUS_ATTENDANCE" });
    checkTime(session);
    return attendanceApi.remove(rows[0].id);
  },
};
