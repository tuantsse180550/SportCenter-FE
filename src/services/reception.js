import { membersApi } from '../api/members';
import { paymentsApi } from '../api/payments';
import { supportApi } from '../api/support';
import { classRegistrationsApi, schedulesApi } from '../api/operations';

/** Receptionist work board: each source loads independently, failures are listed in `errors`. */
export async function loadReceptionBoard(token) {
  const sources = [
    ['members', 'Hội viên', () => membersApi.list(token)],
    ['registrations', 'Đăng ký lớp', () => classRegistrationsApi.list(token)],
    ['payments', 'Thanh toán', () => paymentsApi.list(token)],
    ['support', 'Hỗ trợ', () => supportApi.list(token)],
    ['schedules', 'Lịch tập', () => schedulesApi.list(token)],
  ];
  const results = await Promise.allSettled(sources.map(([, , load]) => load()));
  const data = { errors: [] };
  results.forEach((result, index) => {
    const [key, label] = sources[index];
    if (result.status === 'fulfilled' && Array.isArray(result.value)) data[key] = result.value;
    else { data[key] = null; data.errors.push(`${label}: ${result.reason?.message || 'Không tải được dữ liệu.'}`); }
  });
  return data;
}
