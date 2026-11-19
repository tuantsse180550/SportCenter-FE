// Form/list definitions for the generic /workspace/:resource screens.
// Port of mobile utils/resources.ts.
import { trainingResources } from './training-resources';
import { videoEmbed } from './video';
import { safeImageUrl } from './image';
import { validPhone } from './validation';
import { coursePrice, referenceId } from '../api/operations';

const statusOptions = [{ value: 'ACTIVE', label: 'Hoạt động' }, { value: 'INACTIVE', label: 'Tạm dừng' }];

/**
 * field: { key, label, required?, type?: 'id'|'phone'|'number'|'date'|'time'|'multiline'|'money',
 *          options?, createOnly?, updateOnly?, relation?: '/api/...' }
 */
export const resources = {
  ...trainingResources,
  rooms: { title: 'Phòng tập', singular: 'phòng tập', titleKey: 'name', fields: [
    { key: 'roomNumber', label: 'Mã phòng', required: true }, { key: 'name', label: 'Tên phòng', required: true },
    { key: 'capacity', label: 'Sức chứa', type: 'number', required: true },
    { key: 'status', label: 'Trạng thái', required: true, options: statusOptions },
  ] },
  coaches: { title: 'Huấn luyện viên', singular: 'huấn luyện viên', titleKey: 'fullName', fields: [
    { key: 'userId', label: 'User ID tài khoản COACH đã đăng ký', type: 'id', required: true, createOnly: true },
    { key: 'fullName', label: 'Họ và tên', required: true }, { key: 'phone', label: 'Số điện thoại', type: 'phone', required: true },
    { key: 'subjectId', label: 'Môn thể thao phụ trách', type: 'id', relation: '/api/subjects', required: true, createOnly: true },
  ] },
  subjects: { title: 'Môn thể thao', singular: 'môn thể thao', titleKey: 'name', fields: [{ key: 'name', label: 'Tên môn thể thao', required: true }] },
  courses: { title: 'Khóa học', singular: 'khóa học', titleKey: 'name', fields: [
    { key: 'subjectId', label: 'Môn thể thao', type: 'id', relation: '/api/subjects', required: true },
    { key: 'name', label: 'Tên khóa học', required: true },
    { key: 'price', label: 'Học phí cho 1 suất trong lớp (VND)', type: 'money', required: true },
    { key: 'description', label: 'Mô tả', type: 'multiline' },
    { key: 'imageUrl', label: 'Link ảnh bìa', type: 'image' },
    { key: 'status', label: 'Trạng thái', required: true, options: statusOptions },
  ] },
  lessons: { title: 'Bài học', singular: 'bài học', titleKey: 'title', fields: [
    { key: 'classId', label: 'Lớp học', type: 'id', relation: '/api/classes', required: true },
    { key: 'learningPathId', label: 'Lộ trình học (cùng khóa học với lớp)', type: 'id', relation: '/api/learning-paths', required: true },
    { key: 'title', label: 'Tên bài học', required: true }, { key: 'description', label: 'Nội dung', type: 'multiline' },
    { key: 'order', label: 'Thứ tự bài (từ 1)', type: 'number', required: true },
    { key: 'videoUrl', label: 'Link video hướng dẫn', type: 'video' },
  ] },
  schedules: { title: 'Lịch tập', singular: 'lịch tập', titleKey: 'date', fields: [
    { key: 'classId', label: 'Lớp học', type: 'id', relation: '/api/classes', required: true },
    { key: 'lessonId', label: 'Bài học', type: 'id', relation: '/api/lessons', required: true },
    { key: 'roomId', label: 'Phòng tập', type: 'id', relation: '/api/rooms', required: true },
    { key: 'date', label: 'Ngày', type: 'date', required: true },
    { key: 'startTime', label: 'Giờ bắt đầu', type: 'time', required: true },
    { key: 'endTime', label: 'Giờ kết thúc', type: 'time', required: true },
    { key: 'status', label: 'Trạng thái', required: true, options: [{ value: 'SCHEDULED', label: 'Đã lên lịch' }, { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' }] },
  ] },
  'activity-logs': { title: 'Lịch sử thao tác', singular: 'nhật ký', titleKey: 'action', fields: [
    { key: 'userId', label: 'User ID thực hiện thao tác', type: 'id', required: true },
    { key: 'action', label: 'Nội dung thao tác', type: 'multiline', required: true },
  ] },
};

export const isResource = value => !!value && Object.hasOwn(resources, value);

export function initialValues(resource, item) {
  return Object.fromEntries(resources[resource].fields.map(field => {
    const value = resource === 'courses' && field.key === 'price' ? coursePrice(item) : item?.[field.key];
    let initial;
    if (field.type === 'id') initial = referenceId(value);
    else if (field.type === 'date' && typeof value === 'string') initial = value.slice(0, 10);
    else if (value === undefined || value === null) initial = field.options?.[0].value || (field.type === 'number' ? '1' : '');
    else initial = String(value);
    return [field.key, initial];
  }));
}

/** Returns { errors: {key: message}, payload } ready for the API module. */
export function validateResource(resource, values, editing) {
  const errors = {};
  const payload = {};
  for (const field of resources[resource].fields) {
    if ((editing && field.createOnly) || (!editing && field.updateOnly)) continue;
    const value = (values[field.key] || '').trim();
    payload[field.key] = value;
    if (field.required && !value) errors[field.key] = 'Vui lòng nhập thông tin này.';
    else if (value && field.type === 'id' && !/^[a-f\d]{24}$/i.test(value)) errors[field.key] = 'Chọn bản ghi hoặc nhập ID hợp lệ gồm 24 ký tự.';
    else if (value && field.type === 'phone' && !validPhone(value)) errors[field.key] = 'Số điện thoại Việt Nam chưa hợp lệ.';
    else if (value && field.type === 'video' && !videoEmbed(value)) errors[field.key] = 'Chỉ nhận link https của YouTube, Vimeo hoặc Google Drive.';
    else if (value && field.type === 'image' && !safeImageUrl(value)) errors[field.key] = 'Link ảnh phải bắt đầu bằng https://';
    else if (field.type === 'money') {
      const number = Number(value);
      if (!value || !Number.isFinite(number) || number < 0) errors[field.key] = 'Nhập học phí từ 0 trở lên.';
      else payload[field.key] = number;
    } else if (field.type === 'number') {
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 1) errors[field.key] = 'Nhập số nguyên từ 1 trở lên.';
      else payload[field.key] = number;
    } else if (value && field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) errors[field.key] = 'Ngày chưa hợp lệ.';
    else if (value && field.type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) errors[field.key] = 'Giờ chưa hợp lệ (HH:mm, 24 giờ).';
    else if (field.options && !field.options.some(option => option.value === value)) errors[field.key] = 'Vui lòng chọn giá trị hợp lệ.';
  }
  if (resource === 'schedules' && !errors.startTime && !errors.endTime && values.startTime >= values.endTime) errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.';
  if (resource === 'lesson-progress') {
    // BE: create needs classId (from the chosen lesson); update must not send member/lesson/class.
    if (!editing) { if (!values.classId) errors.lessonId = errors.lessonId || 'Chọn lại bài học để xác định lớp.'; else payload.classId = values.classId; }
    if (!payload.coachComment) delete payload.coachComment;
  }
  if (resource === 'workout-plans') {
    // BE: a plan targets exactly one member OR one class.
    if (values.planTarget === 'class') { payload.memberId = ''; delete errors.memberId; if (!values.classId) errors.classId = 'Chọn lớp nhận kế hoạch.'; }
    else { payload.classId = ''; delete errors.classId; if (!values.memberId) errors.memberId = 'Chọn học viên nhận kế hoạch.'; }
  }
  return { errors, payload };
}
