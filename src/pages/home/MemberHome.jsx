import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { loadMemberHome, upcomingMemberSessions } from '../../services/member-home';
import { entityId, referenceLabel } from '../../api/operations';
import { registrationFor } from '../../api/payments';
import { withQuery, workspacePath } from '../../utils/url';
import { dayOf } from '../../utils/coach-teaching';
import DashboardView, { FeatureCard } from '../../components/dashboard/DashboardView';

export default function MemberHome() {
  const { user, token } = useAuth();
  const load = useCallback(() => loadMemberHome(token, user.id), [token, user.id]);
  const query = useApiQuery(load);
  const data = query.data;
  const upcoming = upcomingMemberSessions(data?.schedules || []);
  const next = upcoming[0];
  // A pending payment of a cancelled registration is no longer due.
  const pending = data?.payments?.filter(item => item.status === 'PENDING' && registrationFor(item, data.registrations || [])?.status === 'PENDING_PAYMENT').length ?? 0;
  const confirmed = data?.registrations?.filter(item => item.status === 'CONFIRMED').length ?? 0;

  const model = data && {
    name: data.profile?.fullName || user.name,
    subtitle: 'Mỗi buổi tập là một bước tiến. Hôm nay bạn đã sẵn sàng chưa?',
    errors: data.errors,
    bannerText: 'Khám phá lớp học phù hợp và bắt đầu hành trình khỏe mạnh của bạn.',
    scheduleLabel: 'Xem lịch tập của tôi',
    metrics: [
      { label: 'Lớp đang tham gia', value: String(confirmed).padStart(2, '0'), detail: 'Lịch tập đã xác nhận', icon: 'layers', path: workspacePath('class-registrations') },
      { label: 'Buổi tập sắp tới', value: String(upcoming.length).padStart(2, '0'), detail: next ? `Gần nhất ${dayOf(next.date).split('-').reverse().join('/')} ${next.startTime}` : 'Chưa có buổi sắp tới', icon: 'calendar', color: 'green', path: workspacePath('schedules') },
      { label: 'Chờ thanh toán', value: String(pending).padStart(2, '0'), detail: 'Khoản học phí cần thanh toán', icon: 'wallet', color: 'purple', path: '/payments' },
      { label: 'Thông báo mới', value: String(data.unread ?? 0).padStart(2, '0'), detail: 'Từ trung tâm và HLV', icon: 'bell', color: 'blue', path: '/notifications' },
    ],
    schedules: data.schedules || [],
    sessionPath: item => withQuery('/session', { id: entityId(item) }),
    attention: [
      data.profileMissing
        ? { urgent: true, icon: 'user', tone: 'amber', title: 'Hoàn thiện hồ sơ của bạn', detail: 'Cần họ tên, số điện thoại và mục tiêu để đăng ký lớp', cta: 'Cập nhật hồ sơ', path: '/profile' }
        : { icon: 'checkCircle', tone: 'green', title: 'Hồ sơ đã sẵn sàng', detail: 'HLV dùng mục tiêu và trình độ để lập kế hoạch cho bạn', cta: 'Xem hồ sơ', path: '/profile' },
      pending
        ? { urgent: true, icon: 'wallet', tone: 'blue', title: `${pending} khoản chờ thanh toán`, detail: 'Thanh toán để xác nhận chỗ trong lớp', cta: 'Thanh toán ngay', path: '/payments' }
        : { icon: 'wallet', tone: 'green', title: 'Không có khoản chờ thanh toán', detail: 'Các giao dịch đã được cập nhật', cta: 'Xem thanh toán', path: '/payments' },
      next
        ? { icon: 'calendar', tone: 'blue', title: `Buổi tiếp theo: ${referenceLabel(next.classId)}`, detail: `${dayOf(next.date).split('-').reverse().join('/')} · ${next.startTime}–${next.endTime} · ${referenceLabel(next.roomId)}`, cta: 'Xem lịch', path: workspacePath('schedules') }
        : { icon: 'layers', tone: 'blue', title: 'Chưa có buổi tập sắp tới', detail: 'Khám phá các lớp đang mở tại trung tâm', cta: 'Khám phá lớp học', path: '/enroll' },
    ],
    bottom: <FeatureCard title="Kế hoạch dành cho bạn" heading="Nền tảng vững chắc, tiến bộ mỗi ngày" text="Xem kế hoạch tập, bài tập về nhà và nhận xét từ huấn luyện viên." cta="Xem kế hoạch" path={workspacePath('workout-plans')} />,
    activityTitle: 'Khám phá lớp học',
    activity: (data.classes || []).slice(0, 4).map(item => ({ title: String(item.name || ''), detail: `${referenceLabel(item.subjectId)} · HLV ${referenceLabel(item.coachId)}`, icon: 'layers' })),
    activityLink: '/explore',
    activityCta: { label: 'Đăng ký lớp mới', path: withQuery('/enroll'), icon: 'plus' },
  };

  return <DashboardView model={model} loading={query.loading} error={query.error} reload={query.reload} />;
}
