import { enc, request } from './client';

// QR entry/exit at the front desk (SportCenter-BE /api/check-ins) and the desk approval of a
// class registration (/api/class-registrations/:id/confirm).
export const checkInApi = {
  /** MEMBER → { member, registrations[{ className, subjectName, status, label, active }], openVisit, nextAction, allowed, code, message } */
  me: token => request('/api/check-ins/me', { token }),
  /** MEMBER → { qrImage (PNG data URL holding only a single-use token), expiresAt, nextAction } */
  issueQr: token => request('/api/check-ins/tokens', { token, method: 'POST' }),
  /** Front desk: who the code belongs to and what to confirm; does not use the code up. */
  preview: (token, qr) => request('/api/check-ins/preview', { token, body: { token: qr } }),
  /** Front desk: action 'IN' | 'OUT' → { action, alreadyRecorded, visit } */
  confirm: (token, qr, action) => request('/api/check-ins/confirm', { token, body: { token: qr, action } }),
  /** Front desk: visits of a day (YYYY-MM-DD, Vietnam time) plus members still inside. */
  visits: (token, date) => request(`/api/check-ins/visits${date ? `?date=${enc(date)}` : ''}`, { token }),
  myVisits: token => request('/api/check-ins/visits/me', { token }),
};

/** Front desk collects the fee and confirms a registration; method 'CASH' | 'BANK_TRANSFER'. */
export const confirmRegistrationAtDesk = (token, registrationId, paymentMethod) =>
  request(`/api/class-registrations/${enc(registrationId)}/confirm`, { token, body: { paymentMethod } });

export const checkInActionLabel = action => (action === 'OUT' ? 'Xác nhận ra' : 'Xác nhận vào');

const timeFormat = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' };
export const clockTime = value => (value ? new Date(value).toLocaleTimeString('vi-VN', timeFormat) : '');
export const dayTime = value => (value ? new Date(value).toLocaleString('vi-VN', { ...timeFormat, day: '2-digit', month: '2-digit' }) : '');

/** Seconds left before an ISO time, never below zero. */
export const secondsLeft = (iso, now = Date.now()) => Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
