import { ApiError } from '../api/client';
import { membersApi } from '../api/members';
import { classRegistrationsApi, classesApi, schedulesApi, referenceId, entityId } from '../api/operations';
import { notificationsApi, ownNotifications } from '../api/notifications';
import { paymentsApi, ownPayments } from '../api/payments';
import { bangkokDate, bangkokTime } from '../utils/url';

export function upcomingMemberSessions(items, now = new Date()) {
  const day = bangkokDate(now);
  const time = bangkokTime(now);
  return items
    .filter(item => item.status === 'SCHEDULED' && (String(item.date).slice(0, 10) > day || (String(item.date).slice(0, 10) === day && String(item.startTime) >= time)))
    .sort((a, b) => `${String(a.date).slice(0, 10)} ${a.startTime}`.localeCompare(`${String(b.date).slice(0, 10)} ${b.startTime}`));
}

/** Member home data; each block fails independently and is reported in `errors`. */
export async function loadMemberHome(token, userId) {
  const data = { profile: null, profileMissing: false, classes: null, schedules: null, registrations: null, payments: null, unread: null, errors: [] };
  async function capture(label, fn, accept) {
    try { accept(await fn()); } catch (e) { data.errors.push(`${label}: ${e instanceof Error ? e.message : 'Không tải được dữ liệu.'}`); }
  }
  await Promise.all([
    (async () => {
      try { data.profile = await membersApi.me(token); }
      catch (e) {
        if (e instanceof ApiError && e.status === 404) data.profileMissing = true;
        else data.errors.push(`Hồ sơ: ${e instanceof Error ? e.message : 'Không tải được hồ sơ.'}`);
      }
    })(),
    capture('Lớp học', () => classesApi.list(token), items => { data.classes = items; }),
    capture('Thông báo', () => notificationsApi.my(token), items => { data.unread = ownNotifications(items, userId).filter(item => !item.isRead).length; }),
  ]);
  const memberId = entityId(data.profile);
  if (!memberId) return data;
  await Promise.all([
    capture('Lịch tập', () => schedulesApi.my(token), items => { data.schedules = items; }),
    capture('Đăng ký lớp', () => classRegistrationsApi.list(token), items => { data.registrations = items.filter(item => referenceId(item.memberId) === memberId); }),
  ]);
  if (data.registrations) await capture('Thanh toán', () => paymentsApi.list(token), items => { data.payments = ownPayments(items, data.registrations, memberId); });
  return data;
}
