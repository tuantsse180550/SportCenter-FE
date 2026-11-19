import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loadReceptionBoard } from '../../services/reception';
import { entityId, referenceLabel } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import { bangkokDate, withQuery, workspacePath } from '../../utils/url';
import { dayOf } from '../../utils/coach-teaching';
import DashboardView, { FeatureCard } from '../../components/dashboard/DashboardView';

const newest = items => [...items].sort((a, b) => String(b.createdAt || b.registeredAt || '').localeCompare(String(a.createdAt || a.registeredAt || '')));

export default function ReceptionHome() {
  const { user, token } = useAuth();
  const load = useCallback(() => loadReceptionBoard(token), [token]);
  const query = useApiQuery(load);
  const data = query.data;
  const today = bangkokDate();
  const pendingRegistrations = data?.registrations?.filter(item => item.status === 'PENDING_PAYMENT') || [];
  const cashToConfirm = data?.payments?.filter(item => item.status === 'PENDING' && ['CASH', 'BANK_TRANSFER'].includes(String(item.paymentMethod))) || [];
  const openSupport = data?.support?.filter(item => item.status !== 'RESOLVED') || [];
  const todaySessions = data?.schedules?.filter(item => dayOf(item.date) === today && item.status !== 'CANCELLED').length ?? 0;

  const model = data && {
    name: user.name,
    subtitle: 'Chào đón hội viên và bắt đầu một ngày vận hành thật suôn sẻ.',
    errors: data.errors,
    bannerText: 'Tiếp đón, đăng ký lớp, thu học phí và hỗ trợ hội viên.',
    metrics: [
      { label: 'Tổng hội viên', value: data.members?.length ?? '—', detail: 'Hồ sơ trên hệ thống', icon: 'users', path: '/members' },
      { label: 'Đăng ký chờ thanh toán', value: String(pendingRegistrations.length).padStart(2, '0'), detail: 'Cần thu học phí', icon: 'layers', color: 'green', path: workspacePath('class-registrations') },
      { label: 'Buổi tập hôm nay', value: String(todaySessions).padStart(2, '0'), detail: 'Lịch lớp trong ngày', icon: 'calendar', color: 'purple', path: workspacePath('schedules', { date: today }) },
      { label: 'Yêu cầu hỗ trợ', value: String(openSupport.length).padStart(2, '0'), detail: 'Đang chờ xử lý', icon: 'help', color: 'blue', path: '/support' },
    ],
    schedules: data.schedules || [],
    sessionPath: item => withQuery('/session', { id: entityId(item) }),
    attention: [
      cashToConfirm.length
        ? { urgent: true, icon: 'wallet', tone: 'amber', title: `${cashToConfirm.length} khoản cần xác nhận thu tiền`, detail: 'Tiền mặt / chuyển khoản tại quầy', cta: 'Kiểm tra thanh toán', path: '/payments' }
        : { icon: 'checkCircle', tone: 'green', title: 'Không có khoản chờ thu tại quầy', detail: 'Các giao dịch đã được cập nhật', cta: 'Xem thanh toán', path: '/payments' },
      openSupport.length
        ? { urgent: true, icon: 'help', tone: 'red', title: `${openSupport.length} yêu cầu hỗ trợ chưa xử lý`, detail: 'Hội viên đang chờ phản hồi', cta: 'Xử lý ngay', path: '/support' }
        : { icon: 'help', tone: 'green', title: 'Không có yêu cầu tồn đọng', detail: 'Mọi yêu cầu đã được giải quyết', cta: 'Xem hỗ trợ', path: '/support' },
      { icon: 'user', tone: 'blue', title: 'Đăng ký hội viên mới tại quầy', detail: 'Tạo tài khoản và hồ sơ trong một bước', cta: 'Đăng ký hội viên', path: '/members/front-desk' },
    ],
    bottom: <FeatureCard title="Tiếp đón hội viên" heading="Đăng ký lớp nhanh tại quầy" text="Chọn lớp, kiểm tra lịch, lưu đăng ký và thu học phí cho hội viên." cta="Đăng ký lớp cho hội viên" path="/enroll" icon="layers" />,
    activityTitle: 'Đăng ký gần đây',
    activity: newest(data.registrations || []).slice(0, 4).map(item => ({ title: item.memberId ? referenceLabel(item.memberId) : 'Hồ sơ hội viên đã bị xóa', detail: `${referenceLabel(item.classId)} · ${item.status === 'CONFIRMED' ? 'Đã xác nhận' : item.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ lễ tân xác nhận'}`, icon: 'layers' })),
    activityLink: workspacePath('class-registrations'),
  };

  return <DashboardView model={model} loading={query.loading} error={query.error} reload={query.reload} />;
}
