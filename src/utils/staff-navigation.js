// Role → home route and the sidebar / mobile tab navigation of the ActiveHub design.

export const roleLabels = {
  MEMBER: 'Hội viên',
  CENTER_MANAGER: 'Quản lý trung tâm',
  COACH: 'Huấn luyện viên',
  RECEPTIONIST: 'Lễ tân',
};

export const roleHome = role => ({
  CENTER_MANAGER: '/manager',
  COACH: '/coach',
  RECEPTIONIST: '/reception',
  MEMBER: '/member',
}[role] || '/account');

export const isWorkspaceRole = role => role === 'COACH' || role === 'CENTER_MANAGER' || role === 'RECEPTIONIST';
export const isStaffRole = role => role === 'COACH' || role === 'CENTER_MANAGER';

const ws = key => `/workspace/${key}`;
// item: { label, path, icon, match?: extra path prefixes that keep the item active, tag? }
const item = (label, path, icon, match = [], tag) => ({ label, path, icon, match, tag });

const NAV = {
  CENTER_MANAGER: [
    { section: 'KHÔNG GIAN LÀM VIỆC', items: [
      item('Tổng quan', '/manager', 'grid'),
      item('Hội viên', '/members', 'users'),
      item('Huấn luyện viên & nhân sự', '/staff', 'user', ['/staff-accounts', ws('coaches')]),
    ] },
    { section: 'QUẢN LÝ VẬN HÀNH', items: [
      item('Lớp học', ws('classes'), 'layers', [ws('class-registrations'), ws('attendances'), '/class-detail', '/enroll', '/registration-detail']),
      item('Lịch tập', ws('schedules'), 'calendar', ['/schedule-import']),
      item('Quét QR ra/vào', '/checkin-desk', 'qr'),
      item('Bộ môn & khóa học', ws('courses'), 'sport', [ws('subjects'), ws('learning-paths'), ws('lessons'), '/catalog-import']),
      item('Phòng tập', ws('rooms'), 'room'),
      item('Gói tập & học phí', '/packages', 'wallet', ['/pricing']),
      item('Tập luyện & tiến độ', ws('workout-plans'), 'target', [ws('workout-results'), ws('lesson-progress')]),
    ] },
    { section: 'DỊCH VỤ', items: [
      item('Thanh toán & hóa đơn', '/payments', 'file', ['/payment-edit', '/payment-receipt']),
      item('Yêu cầu hỗ trợ', '/support', 'help'),
      item('Thông báo', '/notifications', 'bell', ['/notification-compose']),
    ] },
    { section: 'THỐNG KÊ & HỆ THỐNG', items: [
      item('Báo cáo & doanh thu', '/reports', 'chart'),
      item('Lịch sử thao tác', ws('activity-logs'), 'history'),
    ] },
  ],
  COACH: [
    { section: 'KHÔNG GIAN HUẤN LUYỆN', items: [
      item('Tổng quan', '/coach', 'grid'),
      item('Lịch dạy', ws('schedules'), 'calendar'),
      item('Điểm danh', '/attendance', 'checkCircle', [ws('attendances'), '/attendance/session']),
      item('Lớp phụ trách', ws('classes'), 'layers', ['/class-detail', ws('lessons')]),
      item('Học viên', '/coach-students', 'users'),
      item('Kế hoạch tập luyện', ws('workout-plans'), 'target', [], 'AI'),
      item('Kết quả & tiến độ', ws('workout-results'), 'chart', [ws('lesson-progress')]),
      item('Nhận xét học viên', '/feedbacks', 'edit'),
      item('Bài tập về nhà', '/homeworks', 'book'),
      item('Thông báo', '/notifications', 'bell', ['/notification-compose']),
    ] },
  ],
  RECEPTIONIST: [
    { section: 'KHÔNG GIAN LÀM VIỆC', items: [
      item('Bảng công việc', '/reception', 'grid'),
      item('Quét QR ra/vào', '/checkin-desk', 'qr'),
      item('Hội viên', '/members', 'users', ['/members/edit', '/members/front-desk']),
      item('Đăng ký lớp', ws('class-registrations'), 'layers', ['/enroll', '/registration-detail', ws('classes'), '/class-detail']),
      item('Lịch tập', ws('schedules'), 'calendar'),
      item('Điểm danh', ws('attendances'), 'checkCircle'),
      item('Thanh toán & hóa đơn', '/payments', 'wallet', ['/payment-edit', '/payment-receipt']),
      item('Yêu cầu hỗ trợ', '/support', 'help'),
      item('Thông báo', '/notifications', 'bell', ['/notification-compose']),
    ] },
  ],
  MEMBER: [
    { section: 'KHÔNG GIAN CỦA BẠN', items: [
      item('Trang chủ', '/member', 'grid'),
      item('Mã QR ra/vào', '/checkin', 'qr'),
      item('Khám phá lớp học', '/explore', 'layers', [ws('classes'), '/class-detail', '/enroll']),
      item('Lịch của tôi', ws('schedules'), 'calendar', [ws('attendances')]),
      item('Đăng ký của tôi', ws('class-registrations'), 'file', ['/registration-detail']),
      item('Kết quả & tiến độ', ws('workout-results'), 'chart', [ws('lesson-progress')]),
      item('Kế hoạch & bài tập', ws('workout-plans'), 'target', ['/homeworks', '/feedbacks']),
      item('Thanh toán', '/payments', 'wallet', ['/payment-edit', '/payment-receipt', '/pricing']),
      item('Thông báo', '/notifications', 'bell'),
      item('Hỗ trợ', '/support', 'help'),
    ] },
  ],
};

const MOBILE_TABS = {
  CENTER_MANAGER: ['/manager', '/members', ws('classes'), ws('schedules'), '/reports'],
  COACH: ['/coach', ws('schedules'), ws('attendances'), '/coach-students', ws('workout-plans')],
  RECEPTIONIST: ['/reception', '/checkin-desk', '/members', ws('class-registrations'), '/payments'],
  MEMBER: ['/member', '/checkin', '/explore', ws('schedules'), '/payments'],
};

export const navFor = role => NAV[role] || NAV.MEMBER;
export const navItems = role => navFor(role).flatMap(group => group.items);
export function mobileTabsFor(role) {
  const items = navItems(role);
  return (MOBILE_TABS[role] || MOBILE_TABS.MEMBER).map(path => items.find(entry => entry.path === path)).filter(Boolean);
}

/** Whether a nav item should be highlighted for the current path. */
export function isActiveItem(pathname, entry) {
  return [entry.path, ...entry.match].some(path => pathname === path || pathname.startsWith(`${path}/`));
}
export const currentItem = (role, pathname) => navItems(role).find(entry => isActiveItem(pathname, entry));

const extraTitles = { '/account': 'Tài khoản', '/profile': 'Hồ sơ của tôi', '/operations': 'Tất cả tiện ích', '/pricing': 'Khóa học & học phí', '/staff-accounts': 'Tạo tài khoản nhân viên', '/payment-result': 'Kết quả thanh toán', '/session': 'Chi tiết buổi tập' };
export const pageTitle = (role, pathname) => currentItem(role, pathname)?.label || extraTitles[pathname] || 'Không gian làm việc';
