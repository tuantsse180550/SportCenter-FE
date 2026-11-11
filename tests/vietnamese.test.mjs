import test from 'node:test';
import assert from 'node:assert/strict';
import { uiLabel, errorText, errorDetailsText, noticeText } from '../src/utils/vietnamese.js';
import { roleNavigation } from '../src/types/navigation.js';
test('Vietnamese display labels leave API enum values and role routes unchanged', () => {
 const payload = Object.freeze({ status: 'PENDING_PAYMENT', attendance: 'PRESENT', role: 'COACH', paymentMethod: 'BANK_TRANSFER' });
 assert.equal(uiLabel(payload.status), 'Chờ thanh toán');
 assert.equal(uiLabel(payload.attendance), 'Có mặt');
 assert.equal(uiLabel(payload.role), 'Huấn luyện viên');
 assert.equal(uiLabel(payload.paymentMethod), 'Chuyển khoản ngân hàng');
 assert.equal(payload.status, 'PENDING_PAYMENT');
 assert.equal(payload.attendance, 'PRESENT');
 assert.equal(roleNavigation.COACH[0][0], 'Lịch dạy');
 assert.equal(roleNavigation.COACH[0][1], '/coach/schedule');
 assert.equal(uiLabel('Yoga class from database'), 'Yoga class from database');
});
test('API failures are translated for display without mutating diagnostics', () => {
 const error = Object.freeze({ message: 'Internal server error', status: 500, code: 'HTTP', details: Object.freeze({ email: 'email is required' }) });
 assert.match(errorText(error.message, error), /lỗi/i);
 assert.match(errorDetailsText(error.details, error), /email/);
 assert.equal(error.message, 'Internal server error');
 assert.equal(error.status, 500);
 assert.match(errorText('unknown internal English failure', error), /lỗi nội bộ/);
 assert.match(errorText('denied', { status: 403 }), /không có quyền/);
 assert.match(errorText('network failure', { code: 'NETWORK' }), /kết nối/);
});
test('Partial saves and registration notifications retain their meaning in Vietnamese', () => {
 assert.match(errorText('2 attendance records saved before the error. Retry to update remaining records. Internal server error', { status: 500 }), /Đã lưu 2 lượt điểm danh.*các lượt còn lại/);
 assert.equal(noticeText('Trạng thái đăng ký: CONFIRMED'), 'Trạng thái đăng ký: Đã xác nhận');
 assert.equal(uiLabel('No sessions scheduled'), 'Chưa có buổi học được xếp lịch');
});
