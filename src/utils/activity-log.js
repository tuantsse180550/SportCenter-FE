// Turns raw activity-log rows ("PUT /api/courses/<id>", or the older "Update /api/courses/<id>")
// into sentences a manager can read: who did what to which record, grouped by day.
// Pure functions only (no API calls), so they can be unit-tested with node --test.

const id = value => (typeof value === 'string' ? value : value && typeof value === 'object' ? String(value._id || value.id || '') : '');
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const vnd = value => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

/** Feature groups used by the filter, with an icon for the timeline. */
export const ACTIVITY_GROUPS = {
  catalog: { label: 'Danh mục', icon: 'book' },
  schedule: { label: 'Lịch và điểm danh', icon: 'calendar' },
  sales: { label: 'Đăng ký và thanh toán', icon: 'wallet' },
  people: { label: 'Tài khoản và nhân sự', icon: 'users' },
  other: { label: 'Khác', icon: 'bell' },
};

/** /api/<resource> → noun and group. */
const RESOURCES = {
  subjects: ['môn thể thao', 'catalog'], courses: ['khóa học', 'catalog'], 'learning-paths': ['lộ trình', 'catalog'],
  lessons: ['bài học', 'catalog'], classes: ['lớp học', 'catalog'], rooms: ['phòng tập', 'catalog'],
  schedules: ['lịch học', 'schedule'], attendances: ['điểm danh', 'schedule'], 'lesson-progress': ['tiến độ bài học', 'schedule'],
  homeworks: ['bài tập về nhà', 'schedule'], 'workout-plans': ['kế hoạch tập', 'schedule'], 'workout-results': ['kết quả tập', 'schedule'],
  'class-registrations': ['đăng ký lớp', 'sales'], payments: ['thanh toán', 'sales'], 'membership-orders': ['đơn gói tập', 'sales'],
  'check-ins': ['check-in', 'sales'], members: ['hội viên', 'people'], coaches: ['huấn luyện viên', 'people'],
  staff: ['tài khoản nhân sự', 'people'], auth: ['tài khoản', 'people'], manager: ['quản lý', 'other'],
  notifications: ['thông báo', 'other'], 'support-requests': ['yêu cầu hỗ trợ', 'other'], ai: ['trợ lý AI', 'other'],
  'activity-logs': ['nhật ký', 'other'],
};

const VERBS = { POST: 'Tạo', PUT: 'Cập nhật', PATCH: 'Cập nhật', DELETE: 'Xóa' };
const OLD_VERBS = { Create: 'POST', Update: 'PUT', Delete: 'DELETE' };

export const ROLE_LABELS = { CENTER_MANAGER: 'Quản lý', RECEPTIONIST: 'Lễ tân', COACH: 'Huấn luyện viên', MEMBER: 'Hội viên' };

/**
 * Specific wording for endpoints that are not plain create/update/delete.
 * Each rule: [method, resource, sub-path pattern (after the id, or the path rest), sentence, options].
 * `sub` matches the segments after /api/<resource>, with ids replaced by ":id".
 */
const RULES = [
  ['POST', 'schedules', 'import', 'Import lịch học từ Excel', { group: 'schedule', icon: 'upload' }],
  ['POST', 'manager', 'catalog-import', 'Nhập danh mục khóa học từ Excel', { group: 'catalog', icon: 'upload' }],
  ['POST', 'payments', ':id/record-payment', 'Ghi nhận thanh toán tại quầy', { sensitive: true }],
  ['POST', 'payments', ':id/simulate', 'Mô phỏng kết quả thanh toán', { sensitive: true }],
  ['POST', 'payments', ':id/checkout', 'Tạo liên kết thanh toán payOS'],
  ['POST', 'payments', ':id/vnpay', 'Tạo liên kết thanh toán VNPay'],
  ['PUT', 'payments', ':id', 'Sửa giao dịch thanh toán', { sensitive: true }],
  ['PUT', 'support-requests', ':id/status', 'Xử lý yêu cầu hỗ trợ'],
  ['POST', 'staff', 'accounts', 'Tạo tài khoản nhân sự', { sensitive: true }],
  ['PATCH', 'staff', 'accounts/:id', 'Cập nhật tài khoản nhân sự', { sensitive: true }],
  ['POST', 'members', 'front-desk', 'Tạo hồ sơ hội viên tại quầy'],
  ['POST', 'members', 'me', 'Tạo hồ sơ hội viên của mình'],
  ['PUT', 'members', 'me', 'Cập nhật hồ sơ hội viên của mình'],
  ['PATCH', 'coaches', 'me', 'Cập nhật hồ sơ huấn luyện viên của mình'],
  ['POST', 'check-ins', 'confirm', 'Xác nhận vào/ra trung tâm bằng QR', { group: 'schedule', icon: 'qr' }],
  ['POST', 'check-ins', '', 'Xác nhận vào trung tâm bằng QR', { group: 'schedule', icon: 'qr' }],
  ['POST', 'class-registrations', ':id/confirm', 'Thu tiền và xác nhận đăng ký lớp tại quầy', { sensitive: true }],
  ['POST', 'attendances', 'coach', 'Điểm danh buổi học'],
  ['POST', 'attendances', '', 'Điểm danh hội viên'],
  ['PUT', 'attendances', ':id', 'Sửa kết quả điểm danh'],
  ['POST', 'notifications', 'coach', 'Gửi thông báo cho học viên'],
  ['POST', 'notifications', '', 'Gửi thông báo'],
  ['PUT', 'notifications', 'my/read-all', 'Đánh dấu đã đọc tất cả thông báo'],
  ['PUT', 'notifications', ':id', 'Cập nhật thông báo'],
  ['POST', 'check-ins', 'plans', 'Tạo gói tập'],
  ['PUT', 'check-ins', 'plans/:id', 'Cập nhật gói tập'],
  ['DELETE', 'check-ins', 'plans/:id', 'Xóa gói tập', { sensitive: true }],
  ['POST', 'check-ins', 'memberships', 'Gán gói tập cho hội viên'],
  ['POST', 'check-ins', 'tokens', 'Tạo mã check-in'],
  ['POST', 'check-ins', '', 'Check-in hội viên'],
  ['POST', 'membership-orders', '', 'Tạo đơn mua gói tập'],
  ['POST', 'membership-orders', ':id/checkout', 'Thanh toán đơn gói tập'],
  ['POST', 'manager', 'membership-plans', 'Tạo gói hội viên', { group: 'sales' }],
  ['PATCH', 'manager', 'membership-plans/:id', 'Cập nhật gói hội viên', { group: 'sales' }],
  ['POST', 'manager', 'members/:id/membership', 'Gán gói hội viên', { group: 'sales' }],
  ['POST', 'manager', 'members/:id/membership/renew', 'Gia hạn gói hội viên', { group: 'sales' }],
  ['PUT', 'manager', 'role-access/:id', 'Thay đổi quyền của vai trò', { group: 'people', sensitive: true }],
  ['POST', 'ai', 'workout-suggestions', 'Tạo gợi ý bài tập bằng AI'],
  ['POST', 'auth', 'register', 'Đăng ký tài khoản'],
  ['POST', 'auth', 'google/verify-otp', 'Đăng nhập bằng Google'],
  ['PUT', 'class-registrations', ':id', 'Cập nhật đăng ký lớp'],
];

/** Method, path pieces and target id of one log row; `null` when the row is a free-text note. */
export function parseLog(log) {
  let method = String(log?.method || '').toUpperCase();
  let path = String(log?.path || '');
  if (!path) {
    const old = String(log?.action || '').match(/^(Create|Update|Delete)\s+(\/api\/\S+)$/);
    if (!old) return null;
    method = OLD_VERBS[old[1]];
    path = old[2];
  }
  const parts = path.split('?')[0].split('/').filter(Boolean);
  if (parts[0] !== 'api' || !parts[1]) return null;
  const resource = parts[1];
  const rest = parts.slice(2);
  const ids = rest.filter(part => OBJECT_ID.test(part));
  // Record ids and role names (role-access/COACH) are both "the thing acted on".
  const sub = rest.map(part => (OBJECT_ID.test(part) || part === ':id' || /^[A-Z_]{3,}$/.test(part) ? ':id' : part)).join('/');
  return { method, path, resource, sub, targetId: ids[0] || '' };
}

const roleOf = log => String(log?.role || (log?.userId && typeof log.userId === 'object' ? log.userId.role : '') || '');

/** Display name of whoever did it: profile name, else the e-mail's name part. */
export function actorOf(log, index = {}) {
  const user = log?.userId && typeof log.userId === 'object' ? log.userId : null;
  const userId = id(log?.userId);
  const name = user?.fullName || index.people?.get(userId) || (user?.email ? String(user.email).split('@')[0] : '') || 'Người dùng';
  return { id: userId, name, email: user?.email || '', role: roleOf(log), roleLabel: ROLE_LABELS[roleOf(log)] || '' };
}

/**
 * One readable entry: { sentence, target, group, icon, tone, sensitive, technical }.
 * `index.targets` maps a record id to its display name (built by buildTargetIndex).
 */
export function describeLog(log, index = {}) {
  const parsed = parseLog(log);
  if (!parsed) {
    const text = String(log?.action || 'Thao tác');
    return { sentence: text, target: '', group: 'other', icon: 'history', tone: 'neutral', sensitive: false, technical: null };
  }
  const { method, resource, sub, targetId } = parsed;
  const [noun, baseGroup] = RESOURCES[resource] || [resource.replace(/-/g, ' '), 'other'];
  const rule = RULES.find(([m, r, pattern]) => m === method && r === resource && pattern === sub);
  const options = rule?.[4] || {};
  const sentence = rule ? rule[3] : `${VERBS[method] || 'Thao tác'} ${noun}`;
  const known = targetId ? index.targets?.get(targetId) : '';
  // A deleted record is gone from the lists: say so instead of showing its id.
  const target = known || (targetId && method === 'DELETE' ? `${noun} đã xóa` : '');
  const tone = method === 'DELETE' ? 'danger' : method === 'POST' ? 'success' : 'accent';
  const group = options.group || baseGroup;
  return {
    sentence,
    target,
    group,
    icon: options.icon || ACTIVITY_GROUPS[group]?.icon || 'history',
    tone,
    sensitive: Boolean(options.sensitive) || method === 'DELETE',
    technical: { method, path: parsed.path, statusCode: log?.statusCode || null, ip: log?.ip || '' },
  };
}

/**
 * Record id → display name, from the lists the manager can read.
 * lists: { courses, classes, subjects, rooms, lessons, paths, members, coaches, schedules, registrations, payments }
 */
export function buildTargetIndex(lists = {}) {
  const targets = new Map();
  const people = new Map();
  const put = (items, label) => (items || []).forEach(item => { const key = id(item); if (key) targets.set(key, label(item)); });
  const name = item => String(item?.name || item?.title || item?.fullName || '');
  put(lists.subjects, name);
  put(lists.courses, name);
  put(lists.paths, name);
  put(lists.classes, name);
  put(lists.rooms, room => [room.name, room.roomNumber ? `phòng ${room.roomNumber}` : ''].filter(Boolean).join(' · '));
  put(lists.lessons, lesson => `Bài ${lesson.order}: ${lesson.title}`);
  put(lists.members, name);
  put(lists.coaches, name);
  for (const person of [...(lists.members || []), ...(lists.coaches || [])]) {
    const userId = id(person.userId);
    if (userId && person.fullName) people.set(userId, String(person.fullName));
  }
  const classNames = new Map((lists.classes || []).map(item => [id(item), name(item)]));
  const memberNames = new Map((lists.members || []).map(item => [id(item), name(item)]));
  const labelOf = (value, names) => (value && typeof value === 'object' && (value.name || value.fullName) ? name(value) : names.get(id(value)) || '');
  put(lists.schedules, schedule => {
    const day = String(schedule.date || '').slice(0, 10).split('-').reverse().slice(0, 2).join('/');
    return [labelOf(schedule.classId, classNames), day && `buổi ${day}`, schedule.startTime].filter(Boolean).join(' · ');
  });
  const registrationLabel = new Map();
  put(lists.registrations, registration => {
    const label = [labelOf(registration.memberId, memberNames), labelOf(registration.classId, classNames)].filter(Boolean).join(' · lớp ');
    registrationLabel.set(id(registration), label);
    return label;
  });
  put(lists.payments, payment => [vnd(payment.amount), registrationLabel.get(id(payment.classRegistrationId))].filter(Boolean).join(' · '));
  return { targets, people };
}

const bangkokDay = value => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time + 7 * 3600000).toISOString().slice(0, 10) : '';
};

/**
 * Readable rows, newest first. The same action on the same path by the same person within
 * 15 minutes (repeated edits of one record, or a burst of creates) becomes one row with `count`.
 */
export function toActivityRows(logs, index = {}) {
  const rows = [];
  for (const log of logs || []) {
    const parsed = parseLog(log);
    const actor = actorOf(log, index);
    const at = log?.createdAt || '';
    const last = rows.at(-1);
    const sameAsLast = last && parsed && last.key === `${actor.id}|${parsed.method}|${parsed.path}`
      && Math.abs(new Date(last.oldestAt).getTime() - new Date(at).getTime()) <= 15 * 60000;
    // Also merges bursts of creates (e.g. a weekly schedule creates 10 sessions at once).
    if (sameAsLast) {
      last.count += 1;
      last.oldestAt = at;
      continue;
    }
    rows.push({ id: id(log) || `${actor.id}-${at}`, key: parsed ? `${actor.id}|${parsed.method}|${parsed.path}` : `${id(log)}`, actor, at, oldestAt: at, day: bangkokDay(at), count: 1, ...describeLog(log, index) });
  }
  return rows;
}

/** "Hôm nay · 14/11/2026", "Hôm qua · 13/11/2026", "Thứ ba · 11/11/2026". */
export function dayHeading(day, today) {
  if (!day) return 'Không rõ ngày';
  const label = day.split('-').reverse().join('/');
  if (day === today) return `Hôm nay · ${label}`;
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  if (day === yesterday) return `Hôm qua · ${label}`;
  const weekday = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][new Date(`${day}T00:00:00Z`).getUTCDay()];
  return `${weekday} · ${label}`;
}

/** Accent- and case-insensitive search over sentence, target and actor. */
export function matchesActivity(row, query) {
  const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const needle = fold(query).trim();
  return !needle || fold(`${row.sentence} ${row.target} ${row.actor.name} ${row.actor.email}`).includes(needle);
}
