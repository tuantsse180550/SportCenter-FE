import { request, requestHtml, enc } from './client';
import { entityId, referenceId } from './operations';

export const paymentMethods = [
  { value: 'CASH', label: 'Tiền mặt tại trung tâm' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'ONLINE', label: 'Trực tuyến (payOS)' },
];

export const paymentsApi = {
  // MEMBER gets only their own payments; staff get all.
  list: token => request('/api/payments', { token }),
  status: (token, id) => request(`/api/payments/${enc(id)}/status`, { token }),
  create: (token, classRegistrationId, paymentMethod) => request('/api/payments', { token, body: { classRegistrationId, paymentMethod } }),
  update: (token, id, paymentMethod) => request(`/api/payments/${enc(id)}`, { token, method: 'PUT', body: { paymentMethod } }),
  /** Staff confirm a cash / transfer payment at the desk. */
  record: (token, id) => request(`/api/payments/${enc(id)}/record-payment`, { token, body: {} }),
  receipt: (token, id) => requestHtml(`/api/payments/${enc(id)}/receipt`, token),
  /** MEMBER: online checkout link (payOS when BE PAYMENT_MODE=payos, otherwise VNPay) → { paymentUrl }. */
  checkout: (token, id) => request(`/api/payments/${enc(id)}/checkout`, { token, body: {} }),
  /** MEMBER, only when BE runs PAYMENT_MODE=mock. */
  simulate: (token, id, status) => request(`/api/payments/${enc(id)}/simulate`, { token, body: { status } }),
};

export const canManagePayments = role => ['MEMBER', 'CENTER_MANAGER', 'RECEPTIONIST'].includes(role || '');

export function registrationFor(payment, registrations) {
  const id = referenceId(payment.classRegistrationId);
  return registrations.find(item => entityId(item) === id)
    || (payment.classRegistrationId && typeof payment.classRegistrationId === 'object' ? payment.classRegistrationId : undefined);
}

export const ownPayments = (items, registrations, memberId) => items.filter(item => !!memberId && referenceId(registrationFor(item, registrations)?.memberId) === memberId);

export function pendingPaymentForRegistration(items, registrationId) {
  return registrationId ? items.find(item => item.status === 'PENDING' && referenceId(item.classRegistrationId) === registrationId) : undefined;
}

/** Registrations waiting for payment that have no PENDING/SUCCESS payment yet. */
export function payableRegistrations(registrations, payments) {
  return registrations.filter(item => item.status === 'PENDING_PAYMENT'
    && !payments.some(payment => referenceId(payment.classRegistrationId) === entityId(item) && ['PENDING', 'SUCCESS'].includes(String(payment.status))));
}

// The BE does not cancel a PENDING payment when its registration is cancelled.
export const isVoidedPayment = (payment, registration) => payment.status === 'PENDING' && registration?.status === 'CANCELLED';
export function paymentStatusLabel(payment, registration) {
  if (isVoidedPayment(payment, registration)) return 'Không còn hiệu lực · đăng ký đã hủy';
  return payment.status === 'SUCCESS' ? 'Thanh toán thành công' : payment.status === 'FAILED' ? 'Thanh toán thất bại' : 'Chờ thanh toán';
}

export const currency = value => (typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('vi-VN')} ₫` : 'Chưa có học phí');

/** Only open payment pages on known gateway hosts. */
export function validatePaymentUrl(value) {
  if (typeof value !== 'string' || !value) throw new Error('Máy chủ chưa trả về địa chỉ thanh toán.');
  const url = new URL(value);
  const allowed = ['pay.payos.vn', 'sandbox.vnpayment.vn', 'pay.vnpay.vn'];
  if (url.protocol !== 'https:' || !allowed.includes(url.hostname) || url.username || url.password || url.port) {
    throw new Error('Địa chỉ thanh toán từ máy chủ không hợp lệ.');
  }
  return url.toString();
}
