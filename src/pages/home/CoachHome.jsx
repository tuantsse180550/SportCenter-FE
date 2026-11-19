import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadDashboard } from '../../services/dashboard';
import { entityId, referenceLabel } from '../../api/operations';
import { coachStudentName } from '../../utils/coach-roster';
import { useApiQuery } from '../../hooks/useApiQuery';
import { bangkokDate, withQuery, workspacePath } from '../../utils/url';
import { dayOf } from '../../utils/coach-teaching';
import DashboardView, { FeatureCard } from '../../components/dashboard/DashboardView';

export default function CoachHome() {
  const { user, token } = useAuth();
  const load = useCallback(() => loadDashboard('COACH', user.id, token), [user.id, token]);
  const query = useApiQuery(load);
  const data = query.data;
  const today = bangkokDate();
  const students = data ? new Set(data.enrollments.filter(item => item.status === 'CONFIRMED').map(item => item.memberId)).size : 0;
  const pending = data?.enrollments.filter(item => item.status === 'PENDING_PAYMENT') || [];
  const drafts = data?.plans?.filter(plan => plan.status === 'DRAFT').length ?? 0;
  const todaySessions = data?.schedules.filter(item => dayOf(item.date) === today && item.status !== 'CANCELLED').length ?? 0;

  const model = data && {
    name: data.name,
    subtitle: 'Truyền cảm hứng, đồng hành và giúp học viên tiến bộ mỗi ngày.',
    errors: data.errors,
    bannerText: 'Lịch dạy, học viên, điểm danh và kế hoạch tập trong một không gian.',
    schedulePath: workspacePath('schedules'),
    scheduleLabel: 'Xem lịch dạy hôm nay',
    scheduleTitle: 'Lịch dạy',
    metrics: [
      { label: 'Lớp phụ trách', value: String(data.classes.length).padStart(2, '0'), detail: 'Lớp đang hoạt động', icon: 'layers', path: workspacePath('classes') },
      { label: 'Học viên', value: String(students).padStart(2, '0'), detail: 'Đã xác nhận trong lớp', icon: 'users', color: 'green', path: '/coach-students' },
      { label: 'Buổi dạy hôm nay', value: String(todaySessions).padStart(2, '0'), detail: 'Sẵn sàng cho buổi tập', icon: 'calendar', color: 'purple', path: workspacePath('schedules') },
      { label: 'Kế hoạch tập luyện', value: String(data.plans?.length ?? 0).padStart(2, '0'), detail: `${drafts} bản nháp cần duyệt`, icon: 'target', color: 'blue', path: workspacePath('workout-plans') },
    ],
    schedules: data.schedules,
    sessionPath: item => withQuery('/attendance/session', { scheduleId: entityId(item) }),
    attention: [
      { urgent: todaySessions > 0, icon: 'checkCircle', tone: todaySessions ? 'amber' : 'green', title: todaySessions ? `${todaySessions} buổi cần điểm danh hôm nay` : 'Hôm nay không có buổi dạy', detail: 'Điểm danh cả lớp và ghi nhận kết quả sau buổi', cta: 'Mở điểm danh', path: '/attendance' },
      { urgent: drafts > 0, icon: 'target', tone: 'blue', title: drafts ? `${drafts} kế hoạch bản nháp` : 'Kế hoạch tập luyện', detail: 'Dùng gợi ý bài tập theo mục tiêu và trình độ', cta: 'Xem kế hoạch', path: workspacePath('workout-plans') },
      pending.length
        ? { icon: 'clock', tone: 'amber', title: `${pending.length} học viên chờ thanh toán`, detail: 'Sẽ vào danh sách điểm danh sau khi thanh toán', cta: 'Xem học viên', path: '/coach-students' }
        : { icon: 'users', tone: 'green', title: 'Danh sách học viên đã cập nhật', detail: 'Theo dõi mục tiêu và trình độ của từng học viên', cta: 'Xem học viên', path: '/coach-students' },
    ],
    bottom: <FeatureCard title="Đồng hành cùng học viên" heading="Nền tảng vững chắc, tiến bộ mỗi ngày" text="Gửi nhận xét cho cả lớp hoặc từng học viên, giao bài tập về nhà và theo dõi tiến độ." cta="Gửi nhận xét" path="/feedbacks" />,
    activityTitle: 'Học viên mới & kết quả',
    activity: [
      ...data.enrollments.slice(0, 2).map(item => ({ title: coachStudentName(item), detail: `${referenceLabel(item.class)} · ${item.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Chờ thanh toán'}`, icon: 'user' })),
      ...data.activity.map(result => ({ title: String(result.result || '').slice(0, 80), detail: referenceLabel(result.memberId), icon: 'chart' })),
    ],
    activityLink: '/coach-students',
    activityCta: { label: 'Gửi thông báo cho học viên', path: '/notification-compose', icon: 'send' },
  };

  return <DashboardView model={model} loading={query.loading} error={query.error} reload={query.reload} />;
}
