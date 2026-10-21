export const roleNavigation = {
  CENTER_MANAGER: [
    ["Phòng học", "/manager/rooms", "grid"],
    ["Lịch học", "/manager/schedules", "calendar"],
    ["Tổng quan", "/manager/dashboard", "grid"],
    ["Lớp học", "/manager/classes", "calendar"],
    ["Thành viên", "/manager/members", "users"],
    ["Gói hội viên", "/manager/packages", "card"],
    ["Yêu cầu đổi huấn luyện viên", "/manager/coach-requests", "swap"],
    ["Báo cáo", "/manager/reports", "chart"],
    ["Vai trò", "/manager/roles", "shield"],
    ["Nhật ký hoạt động", "/manager/audit-log", "history"],
  ],
  COACH: [
    ["Lịch dạy", "/coach/schedule", "calendar"],
    ["Kế hoạch tập luyện", "/coach/training-plans", "clipboard"],
    ["Yêu cầu thay đổi", "/coach/change-requests", "swap"],
  ],
  MEMBER: [
    ["Trang chủ", "/member/home", "grid"],
    ["Lớp học", "/member/classes", "activity"],
    ["Lịch học của tôi", "/member/schedule", "calendar"],
    ["Hội viên", "/member/membership", "card"],
    ["Kết quả", "/member/results", "chart"],
    ["Trợ lý AI", "/member/ai", "spark"],
    ["Tài khoản", "/member/account", "user"],
  ],
  RECEPTIONIST: [
    ["Thành viên", "/receptionist/members", "search"],
    ["Thành viên mới", "/receptionist/members/new", "userplus"],
    ["Thanh toán", "/receptionist/payments", "card"],
    ["Hóa đơn", "/receptionist/invoices", "invoice"],
  ],
};
