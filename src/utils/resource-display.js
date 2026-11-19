import { coursePrice, referenceLabel } from '../api/operations';
import { resources } from './resources';

export const statusLabels = {
  SCHEDULED: 'Đã lên lịch', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', PENDING_PAYMENT: 'Chờ lễ tân xác nhận', CONFIRMED: 'Đã xác nhận',
  PRESENT: 'Có mặt', ABSENT: 'Vắng mặt', NOT_STARTED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang học', DRAFT: 'Bản nháp', APPROVED: 'Đã duyệt',
  ACTIVE: 'Hoạt động', INACTIVE: 'Tạm dừng', PENDING: 'Chờ xử lý', SUCCESS: 'Thành công', FAILED: 'Thất bại', RESOLVED: 'Đã giải quyết',
};

export function titleFor(resource, item) {
  if (resource === 'schedules') return `${String(item.date || '').slice(0, 10)} · ${String(item.startTime || '')} – ${String(item.endTime || '')}`;
  if (resource === 'attendances') return `${referenceLabel(item.memberId)} · ${String(item.date || '').slice(0, 10)}`;
  const value = item[resources[resource].titleKey];
  return typeof value === 'object' ? referenceLabel(value) : String(value || 'Chưa có tên');
}

const tuition = price => (price === undefined ? 'Chưa có học phí' : `${price.toLocaleString('vi-VN')} ₫`);

/** Multi-line detail text for list cards (render with white-space: pre-line). */
export function detailFor(resource, item) {
  const status = statusLabels[String(item.status)] || String(item.status || '');
  switch (resource) {
    case 'rooms': return `Phòng ${String(item.roomNumber || '')} · ${String(item.capacity || '')} người\n${status}`;
    case 'coaches': return String(item.phone || '');
    case 'subjects': return 'Môn thể thao trên hệ thống';
    case 'courses': return `Học phí: ${tuition(coursePrice(item))} / suất\n${status} · ${String(item.description || '')}`;
    case 'lessons': return `Bài ${String(item.order)} · ${referenceLabel(item.learningPathId)}${item.videoUrl ? ' · ▶ Có video' : ''}\n${String(item.description || '')}`;
    case 'schedules': return `${referenceLabel(item.classId)} · ${referenceLabel(item.lessonId)}\nPhòng: ${referenceLabel(item.roomId)} · ${status}`;
    case 'activity-logs': return `${referenceLabel(item.userId)}\n${item.createdAt ? new Date(String(item.createdAt)).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : ''}`;
    case 'classes': return `${referenceLabel(item.subjectId)} · ${referenceLabel(item.courseId)}\nHLV: ${referenceLabel(item.coachId)}`;
    case 'class-registrations': return `${item.memberId ? referenceLabel(item.memberId) : 'Hồ sơ hội viên đã bị xóa'}\n${status}`;
    case 'attendances': return `${referenceLabel(item.classId)} · ${referenceLabel(item.lessonId)}\n${status}`;
    case 'learning-paths': return `${referenceLabel(item.courseId)}\n${String(item.description || '')}`;
    case 'lesson-progress': return `${referenceLabel(item.memberId)}\n${status}${item.coachComment ? `\nNhận xét: ${String(item.coachComment)}` : ''}`;
    case 'workout-plans': return `${item.memberId ? referenceLabel(item.memberId) : `Cả lớp ${referenceLabel(item.classId)}`} · HLV ${referenceLabel(item.coachId)}\n${String(item.plan || '')}\n${status}`;
    case 'workout-results': return `${referenceLabel(item.memberId)} · ${referenceLabel(item.workoutPlanId)}\n${String(item.comment || '')}`;
    default: return '';
  }
}
