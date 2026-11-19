import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTargetIndex, dayHeading, describeLog, matchesActivity, parseLog, toActivityRows } from '../src/utils/activity-log.js';

const COURSE = '6af3466f100ea5b2b5b88eb6';
const CLASS = '6aeaa8eee8e7c3cc46ac368a';
const PAYMENT = '6aeaa971e8e7c3cc46ac36ae';
const REG = '6aeaa971e8e7c3cc46ac36af';
const MEMBER = '6aeaa971e8e7c3cc46ac36b0';
const manager = { _id: '6aeaa971e8e7c3cc46ac3600', email: 'tuan@example.com', role: 'CENTER_MANAGER' };

const index = buildTargetIndex({
  courses: [{ _id: COURSE, name: 'Yoga cơ bản' }],
  classes: [{ _id: CLASS, name: 'Bóng bàn K2' }],
  members: [{ _id: MEMBER, fullName: 'Nguyễn Văn A', userId: 'u-member' }],
  registrations: [{ _id: REG, memberId: MEMBER, classId: { _id: CLASS, name: 'Bóng bàn K2' } }],
  payments: [{ _id: PAYMENT, amount: 1500000, classRegistrationId: REG }],
});

test('reads both log formats: team (method + path) and older "Update /api/..."', () => {
  assert.deepEqual(parseLog({ method: 'PUT', path: `/api/courses/${COURSE}` }), { method: 'PUT', path: `/api/courses/${COURSE}`, resource: 'courses', sub: ':id', targetId: COURSE });
  assert.equal(parseLog({ action: `Update /api/courses/${COURSE}` }).method, 'PUT');
  assert.equal(parseLog({ action: 'Create /api/manager/catalog-import' }).sub, 'catalog-import');
  assert.equal(parseLog({ action: 'Ghi chú tay của quản lý' }), null);
});

test('plain create / update / delete become a sentence with the record name', () => {
  assert.deepEqual(
    (({ sentence, target, group, tone, sensitive }) => ({ sentence, target, group, tone, sensitive }))(describeLog({ action: `Update /api/courses/${COURSE}` }, index)),
    { sentence: 'Cập nhật khóa học', target: 'Yoga cơ bản', group: 'catalog', tone: 'accent', sensitive: false },
  );
  const removed = describeLog({ method: 'DELETE', path: '/api/classes/6aeaa8eee8e7c3cc46ac0000' }, index);
  assert.equal(removed.sentence, 'Xóa lớp học');
  assert.equal(removed.target, 'lớp học đã xóa');
  assert.equal(removed.sensitive, true);
});

test('special endpoints get their own wording and sensitive flag', () => {
  const paid = describeLog({ method: 'POST', path: `/api/payments/${PAYMENT}/record-payment` }, index);
  assert.equal(paid.sentence, 'Ghi nhận thanh toán tại quầy');
  assert.equal(paid.target, '1.500.000 ₫ · Nguyễn Văn A · lớp Bóng bàn K2');
  assert.equal(paid.sensitive, true);
  assert.equal(describeLog({ action: 'Create /api/manager/catalog-import' }).sentence, 'Nhập danh mục khóa học từ Excel');
  assert.equal(describeLog({ method: 'POST', path: '/api/schedules/import' }).group, 'schedule');
  const roles = describeLog({ method: 'PUT', path: '/api/manager/role-access/COACH' });
  assert.equal(roles.sentence, 'Thay đổi quyền của vai trò');
  assert.equal(roles.sensitive, true);
  assert.equal(describeLog({ method: 'PATCH', path: '/api/staff/accounts/6aeaa971e8e7c3cc46ac3601' }).sentence, 'Cập nhật tài khoản nhân sự');
});

test('free-text logs are kept as they are', () => {
  const note = describeLog({ action: 'Kiểm kê phòng tập' });
  assert.equal(note.sentence, 'Kiểm kê phòng tập');
  assert.equal(note.technical, null);
});

test('repeated edits of one record, and bursts of creates, collapse into one row', () => {
  const at = minutes => new Date(Date.UTC(2026, 10, 11, 4, minutes)).toISOString();
  const rows = toActivityRows([
    { _id: '1', userId: manager, method: 'PUT', path: `/api/courses/${COURSE}`, createdAt: at(10) },
    { _id: '2', userId: manager, method: 'PUT', path: `/api/courses/${COURSE}`, createdAt: at(5) },
    { _id: '3', userId: manager, method: 'PUT', path: `/api/courses/${COURSE}`, createdAt: at(1) },
    { _id: '4', userId: manager, method: 'POST', path: '/api/classes', createdAt: at(0) },
    { _id: '5', userId: manager, method: 'POST', path: '/api/classes', createdAt: at(0) },
  ], index);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[1].sentence, 'Tạo lớp học');
  assert.equal(rows[1].count, 2);
  assert.equal(rows[0].actor.name, 'tuan');
  assert.equal(rows[0].actor.roleLabel, 'Quản lý');
  assert.equal(rows[0].day, '2026-11-11');
});

test('day headings and accent-insensitive search', () => {
  assert.equal(dayHeading('2026-11-14', '2026-11-14'), 'Hôm nay · 14/11/2026');
  assert.equal(dayHeading('2026-11-13', '2026-11-14'), 'Hôm qua · 13/11/2026');
  assert.equal(dayHeading('2026-11-11', '2026-11-14'), 'Thứ tư · 11/11/2026');
  assert.equal(dayHeading('2026-11-09', '2026-11-14'), 'Thứ hai · 09/11/2026');
  const [row] = toActivityRows([{ _id: '1', userId: manager, method: 'PUT', path: `/api/courses/${COURSE}`, createdAt: '2026-11-11T04:00:00Z' }], index);
  assert.equal(matchesActivity(row, 'yoga co ban'), true);
  assert.equal(matchesActivity(row, 'bóng bàn'), false);
});
