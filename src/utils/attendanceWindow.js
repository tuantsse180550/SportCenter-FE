// Schedule.date is a calendar date; start/end times are Vietnam local time.
export function attendanceWindow(session, now = Date.now()) {
  if (session.status === "CANCELLED") return { allowed: false, code: "ATTENDANCE_CANCELLED", message: "Buổi học đã hủy, không thể điểm danh." };
  const day = session.date?.slice(0, 10);
  const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const calendar = new Date(day + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "") || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day || !validTime(session.startTime) || !validTime(session.endTime) || session.startTime >= session.endTime || !Number.isFinite(now)) {
    return { allowed: false, code: "ATTENDANCE_INVALID_TIME", message: "Chưa xác định được thời gian buổi học. Vui lòng liên hệ quản lý." };
  }
  const start = Date.parse(day + "T" + session.startTime + ":00+07:00");
  const end = Date.parse(day + "T" + session.endTime + ":00+07:00");
  const hours = day.split("-").reverse().join("/") + " từ " + session.startTime + " đến " + session.endTime + " (giờ Việt Nam).";
  if (now < start) return { allowed: false, code: "ATTENDANCE_NOT_STARTED", message: "Chưa đến giờ học. Chỉ được điểm danh " + hours };
  if (now >= end) return { allowed: false, code: "ATTENDANCE_ENDED", message: "Buổi học đã kết thúc, không thể tạo, sửa hoặc xóa điểm danh." };
  return { allowed: true, code: "ATTENDANCE_OPEN", message: "Đang trong giờ điểm danh: " + hours };
}
