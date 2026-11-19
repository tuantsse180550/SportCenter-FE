import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadDashboard } from '../../services/dashboard';
import { entityId } from '../../api/operations';
import { currency } from '../../api/payments';
import { useApiQuery } from '../../hooks/useApiQuery';
import { bangkokDate, withQuery, workspacePath } from '../../utils/url';
import { dayOf } from '../../utils/coach-teaching';
import DashboardView from '../../components/dashboard/DashboardView';
import RevenueCard from '../../components/dashboard/RevenueCard';
import { buildTargetIndex, toActivityRows } from '../../utils/activity-log';

const timeOf = value => (value ? new Date(String(value)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '');

export default function ManagerHome() {
  const { user, token } = useAuth();
  const load = useCallback(() => loadDashboard('CENTER_MANAGER', user.id, token), [user.id, token]);
  const query = useApiQuery(load);
  const data = query.data;
  const today = bangkokDate();
  const todaySessions = data?.schedules.filter(item => dayOf(item.date) === today && item.status !== 'CANCELLED').length;
  const pending = data?.registrationStats?.find(stat => stat.status === 'PENDING_PAYMENT')?.count;

  const model = data && {
    name: user.name,
    subtitle: 'Một ngày mới, thêm nhiều chuyển động tích cực. Cùng nhìn lại trung tâm của bạn.',
    errors: data.errors,
    metrics: [
      { label: 'Tổng hội viên', value: data.members?.length ?? '—', detail: 'Hồ sơ hội viên trên hệ thống', icon: 'users', path: '/members', positive: true },
      { label: 'Lớp đang hoạt động', value: String(data.classes.length).padStart(2, '0'), detail: `${data.metrics[1]?.value ?? 0} huấn luyện viên`, icon: 'layers', color: 'green', path: workspacePath('classes') },
      { label: 'Buổi tập hôm nay', value: String(todaySessions ?? 0).padStart(2, '0'), detail: 'Lịch tập đang diễn ra', icon: 'calendar', color: 'purple', path: workspacePath('schedules', { date: today }) },
      { label: 'Doanh thu tháng này', value: data.revenueMonth === null ? '—' : currency(data.revenueMonth), detail: 'Thanh toán thành công', icon: 'wallet', color: 'blue', path: '/reports' },
    ],
    schedules: data.schedules,
    sessionPath: item => withQuery('/session', { id: entityId(item) }),
    attention: [
      pending
        ? { urgent: true, icon: 'wallet', tone: 'amber', title: `${pending} đăng ký chờ thanh toán`, detail: 'Cần thu học phí để xác nhận học viên vào lớp', cta: 'Xem đăng ký', path: workspacePath('class-registrations') }
        : { icon: 'checkCircle', tone: 'green', title: 'Không có đăng ký chờ thanh toán', detail: 'Các đăng ký đã được xử lý', cta: 'Xem đăng ký', path: workspacePath('class-registrations') },
      { icon: 'calendar', tone: todaySessions ? 'blue' : 'green', title: todaySessions ? `${todaySessions} buổi tập hôm nay` : 'Hôm nay chưa có buổi tập', detail: 'Theo dõi lịch tập và phòng tập trong ngày', cta: 'Xem lịch tập', path: workspacePath('schedules', { date: today }) },
      { icon: 'wallet', tone: 'blue', title: 'Gói tập & học phí', detail: 'Gán hoặc gia hạn gói thành viên cho hội viên', cta: 'Quản lý gói tập', path: '/packages' },
    ],
    bottom: <RevenueCard token={token} />,
    // Same wording as the activity history page; names come from the lists the dashboard already loaded.
    activity: toActivityRows(data.activity, buildTargetIndex({ classes: data.classes, members: data.members, schedules: data.schedules })).map(row => ({
      title: `${row.sentence}${row.target ? ` · ${row.target}` : ''}${row.count > 1 ? ` (${row.count} lần)` : ''}`,
      detail: [row.actor.name, row.actor.roleLabel].filter(Boolean).join(' · '),
      time: timeOf(row.at),
      icon: row.icon,
    })),
    activityLink: workspacePath('activity-logs'),
    activityCta: { label: 'Quản lý huấn luyện viên & nhân sự', path: '/staff', icon: 'user' },
  };

  return <DashboardView model={model} loading={query.loading} error={query.error} reload={query.reload} />;
}
