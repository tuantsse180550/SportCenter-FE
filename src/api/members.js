import { request, enc } from './client';

export const memberLevels = [
  { value: 'BEGINNER', label: 'Mới bắt đầu' },
  { value: 'INTERMEDIATE', label: 'Trung cấp' },
  { value: 'ADVANCED', label: 'Nâng cao' },
];

export const memberId = member => member?.id || member?._id || '';

// input: { fullName, phone, goal, level }
function body(input) {
  return { fullName: input.fullName.trim(), phone: input.phone.replace(/[\s.-]/g, ''), goal: input.goal.trim(), level: input.level };
}

export const membersApi = {
  /** Receptionist / manager: create the user account and member profile in one step. */
  frontDesk: (token, input, email, password) => request('/api/members/front-desk', { token, body: { ...body(input), email: email.trim().toLowerCase(), password } }),
  me: token => request('/api/members/me', { token }),
  createMe: (token, input) => request('/api/members/me', { token, body: body(input) }),
  updateMe: (token, input) => request('/api/members/me', { token, method: 'PUT', body: body(input) }),
  /** Optional server-side search by name/phone (?q=). */
  list: (token, query = '') => request(`/api/members${query.trim() ? `?q=${enc(query.trim())}` : ''}`, { token }),
  create: (token, userId, input) => request('/api/members', { token, body: { ...body(input), userId: userId.trim() } }),
  update: (token, id, input) => request(`/api/members/${enc(id)}`, { token, method: 'PUT', body: body(input) }),
  remove: (token, id) => request(`/api/members/${enc(id)}`, { token, method: 'DELETE' }),
};
