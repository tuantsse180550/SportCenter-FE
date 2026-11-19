const relation = (key, label, path, required = true) => ({ key, label, type: 'id', relation: `/api/${path}`, required });
const options = pairs => pairs.map(([value, label]) => ({ value, label }));

export const trainingResources = {
  classes: { title: 'Lớp học', singular: 'lớp học', titleKey: 'name', fields: [
    { key: 'name', label: 'Tên lớp học', required: true }, relation('courseId', 'Khóa học', 'courses'), relation('coachId', 'Huấn luyện viên', 'coaches'),
  ] },
  'class-registrations': { title: 'Đăng ký lớp', singular: 'đăng ký lớp', titleKey: 'classId', fields: [
    relation('classId', 'Lớp học', 'classes'), relation('memberId', 'Hội viên', 'members'),
    { key: 'status', label: 'Trạng thái đăng ký', required: true, updateOnly: true, options: options([['PENDING_PAYMENT', 'Chờ thanh toán'], ['CONFIRMED', 'Đã xác nhận'], ['CANCELLED', 'Đã hủy']]) },
  ] },
  attendances: { title: 'Điểm danh', singular: 'điểm danh', titleKey: 'date', fields: [
    relation('classId', 'Lớp học', 'classes'), relation('memberId', 'Hội viên', 'members'), relation('lessonId', 'Bài học', 'lessons'),
    { key: 'date', label: 'Ngày', type: 'date', required: true },
    { key: 'status', label: 'Điểm danh', required: true, options: options([['PRESENT', 'Có mặt'], ['ABSENT', 'Vắng mặt']]) },
  ] },
  'learning-paths': { title: 'Lộ trình học', singular: 'lộ trình học', titleKey: 'name', fields: [
    relation('courseId', 'Khóa học', 'courses'), { key: 'name', label: 'Tên lộ trình', required: true }, { key: 'description', label: 'Mô tả', type: 'multiline' },
  ] },
  'lesson-progress': { title: 'Tiến độ bài học', singular: 'tiến độ bài học', titleKey: 'lessonId', fields: [
    { ...relation('lessonId', 'Bài học', 'lessons'), createOnly: true }, { ...relation('memberId', 'Hội viên', 'members'), createOnly: true },
    { key: 'status', label: 'Tiến độ', required: true, options: options([['NOT_STARTED', 'Chưa bắt đầu'], ['IN_PROGRESS', 'Đang học'], ['COMPLETED', 'Hoàn thành']]) },
    { key: 'coachComment', label: 'Nhận xét của huấn luyện viên', type: 'multiline', updateOnly: true },
  ] },
  'workout-plans': { title: 'Kế hoạch tập luyện', singular: 'kế hoạch tập luyện', titleKey: 'goal', fields: [
    relation('coachId', 'Huấn luyện viên', 'coaches'), relation('memberId', 'Học viên nhận kế hoạch', 'members', false), relation('classId', 'Lớp nhận kế hoạch', 'classes', false),
    { key: 'goal', label: 'Mục tiêu', required: true },
    { key: 'level', label: 'Trình độ', required: true, options: options([['BEGINNER', 'Mới bắt đầu'], ['INTERMEDIATE', 'Trung cấp'], ['ADVANCED', 'Nâng cao']]) },
    { key: 'plan', label: 'Nội dung kế hoạch tập', type: 'multiline', required: true },
    { key: 'source', label: 'Nguồn kế hoạch', required: true, options: options([['COACH', 'Huấn luyện viên'], ['AI', 'AI']]) },
    { key: 'status', label: 'Trạng thái', required: true, options: options([['DRAFT', 'Bản nháp'], ['APPROVED', 'Đã duyệt']]) },
  ] },
  'workout-results': { title: 'Kết quả tập luyện', singular: 'kết quả tập luyện', titleKey: 'result', fields: [
    relation('workoutPlanId', 'Kế hoạch tập', 'workout-plans'), relation('memberId', 'Hội viên', 'members'),
    { key: 'result', label: 'Kết quả tập luyện', type: 'multiline', required: true }, { key: 'comment', label: 'Nhận xét', type: 'multiline' },
  ] },
};
