import { request, requestEnvelope } from './client';

/**
 * Normalises POST /api/auth/google:
 * { requiresOTP: false, token, user } or { requiresOTP: true, email, challengeToken }.
 */
export function parseGoogleAuth(result) {
  const data = result?.data;
  if (result?.requiresOTP === true) {
    if (!data?.email || !data.challengeToken) throw new Error('Máy chủ chưa trả về thông tin xác minh OTP.');
    return { requiresOTP: true, email: data.email, challengeToken: data.challengeToken };
  }
  if (!data?.token || !data.user) throw new Error('Máy chủ chưa trả về phiên đăng nhập Google hợp lệ.');
  return { requiresOTP: false, token: data.token, user: data.user };
}

const normalizeEmail = email => email.trim().toLowerCase();

export const authApi = {
  // Public sign-up always creates a MEMBER; staff accounts come from /api/staff/accounts.
  register: (email, password) => request('/api/auth/register', { body: { email: normalizeEmail(email), password } }),
  verifyRegistration: (email, otp) => request('/api/auth/register/verify-otp', { body: { email: normalizeEmail(email), otp } }),
  forgotPassword: email => request('/api/auth/forgot-password', { body: { email: normalizeEmail(email) } }),
  resetPassword: (token, password) => request('/api/auth/reset-password', { body: { token, password } }),
  login: (email, password) => request('/api/auth/login', { body: { email: normalizeEmail(email), password } }),
  google: async idToken => parseGoogleAuth(await requestEnvelope('/api/auth/google', { body: { idToken } })),
  verifyGoogleOtp: (challengeToken, otp) => request('/api/auth/google/verify-otp', { body: { challengeToken, otp } }),
  me: token => request('/api/auth/me', { token }),
};
