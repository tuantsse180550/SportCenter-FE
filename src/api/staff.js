import { request, enc } from './client';

// CENTER_MANAGER: staff accounts (COACH / RECEPTIONIST).
export const staffApi = {
  /** → [{ _id, email, fullName, phone, role, status, coach: { subjectId } | null }] */
  list: token => request('/api/staff/accounts', { token }),
  /** input: any of { fullName, phone, status: 'ACTIVE'|'INACTIVE', role, subjectId } */
  update: (token, id, input) => request(`/api/staff/accounts/${enc(id)}`, { token, method: 'PATCH', body: input }),
  /** input: { email, password, role, fullName, phone, subjectId? } — a coach profile is created for COACH. */
  createAccount: (token, input) => request('/api/staff/accounts', {
    token,
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role,
      fullName: input.fullName.trim(),
      phone: input.phone.replace(/[\s.-]/g, ''),
      ...(input.role === 'COACH' && input.subjectId ? { subjectId: input.subjectId } : {}),
    },
  }),
};
