import { referenceId } from '../api/operations';

const memberResources = ['classes', 'schedules', 'class-registrations', 'attendances', 'coaches', 'subjects', 'courses', 'learning-paths', 'lessons', 'lesson-progress', 'workout-plans', 'workout-results'];
const coachResources = ['classes', 'schedules', 'attendances', 'learning-paths', 'lessons', 'lesson-progress', 'workout-plans', 'workout-results', 'subjects', 'courses'];
const receptionResources = ['classes', 'schedules', 'class-registrations', 'attendances', 'coaches', 'subjects', 'courses', 'rooms'];

export function canReadResource(resource, role) {
  if (role === 'CENTER_MANAGER') return true;
  const allowed = role === 'MEMBER' ? memberResources : role === 'COACH' ? coachResources : role === 'RECEPTIONIST' ? receptionResources : [];
  return allowed.includes(resource);
}

export const workflowDescriptions = {
  MEMBER: { title: 'Hành trình tham gia lớp', steps: ['Chọn lớp và xem lịch', 'Lưu thông tin hội viên', 'Xác nhận đăng ký', 'Thanh toán', 'Theo dõi lịch và kết quả'] },
  COACH: { title: 'Công việc buổi dạy', steps: ['Xem lịch dạy và học viên', 'Điểm danh lớp phụ trách', 'Cập nhật tiến độ bài học', 'Lập kế hoạch và ghi nhận kết quả'] },
  RECEPTIONIST: { title: 'Quy trình phục vụ hội viên', steps: ['Kiểm tra hồ sơ hội viên', 'Tư vấn lớp và lịch', 'Lưu đăng ký cho hội viên', 'Theo dõi yêu cầu thanh toán', 'Điểm danh và xử lý hỗ trợ'] },
  CENTER_MANAGER: { title: 'Chuẩn bị và vận hành lớp', steps: ['Tạo môn, khóa học và học phí', 'Bổ sung coach, phòng, lộ trình và bài học', 'Tạo lớp rồi sắp xếp lịch', 'Theo dõi đăng ký và thanh toán', 'Kiểm tra hoạt động và hỗ trợ'] },
};

/** Coach sees attendances of own classes and progress of own students only. */
export function scopeCoachRecords(resource, records, ownClasses, students) {
  const classIds = new Set(ownClasses.map(item => referenceId(item)));
  const memberIds = new Set(students.map(item => referenceId(item.member)));
  if (resource === 'attendances') return records.filter(item => classIds.has(referenceId(item.classId)));
  if (resource === 'lesson-progress') return records.filter(item => memberIds.has(referenceId(item.memberId)));
  return records;
}

export function assertCoachAssignment(input, coachId, classes, students) {
  if (input.classId && !classes.some(item => referenceId(item) === input.classId && referenceId(item.coachId) === coachId)) throw new Error('Chọn lớp do bạn phụ trách.');
  if (input.memberId && !students.some(item => referenceId(item.member) === input.memberId && (!input.classId || referenceId(item.class) === input.classId))) throw new Error('Chọn học viên đã được xác nhận trong lớp bạn phụ trách.');
}
