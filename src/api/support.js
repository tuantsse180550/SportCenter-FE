import { request, enc } from './client';
import { referenceId } from './operations';

export const ownSupport = (items, memberId) => items.filter(item => !!memberId && referenceId(item.memberId) === memberId);

export const supportApi = {
  // MEMBER sees only their own requests (scoped by BE).
  list: token => request('/api/support-requests', { token }),
  /** For MEMBER the BE uses their own profile; staff must pass the member's id. */
  create: (token, memberId, message) => request('/api/support-requests', { token, body: { memberId, message: message.trim() } }),
  updateStatus: (token, id, status) => request(`/api/support-requests/${enc(id)}/status`, { token, method: 'PUT', body: { status } }),
  /** Staff answer to the member (who and when are stored by the BE, the member is notified); close=true also resolves it. */
  reply: (token, id, response, close) => request(`/api/support-requests/${enc(id)}/status`, {
    token, method: 'PUT', body: { response: response.trim(), ...(close ? { status: 'RESOLVED' } : {}) },
  }),
};

/** "Hội viên gửi qua app" / "Lễ tân ghi nhận tại quầy"; '' for older requests saved without createdBy. */
export function supportSource(item) {
  const role = item?.createdBy && typeof item.createdBy === 'object' ? item.createdBy.role : '';
  if (!role) return '';
  return role === 'MEMBER' ? 'Hội viên gửi qua app' : role === 'CENTER_MANAGER' ? 'Quản lý ghi nhận tại quầy' : 'Lễ tân ghi nhận tại quầy';
}

/** Who answered, as shown under the answer: the role, or the e-mail when the role is unknown. */
export function supportResponder(item) {
  const by = item?.respondedBy && typeof item.respondedBy === 'object' ? item.respondedBy : null;
  if (!by) return 'Trung tâm';
  return by.role === 'CENTER_MANAGER' ? 'Quản lý trung tâm' : by.role === 'RECEPTIONIST' ? 'Lễ tân' : String(by.email || 'Trung tâm');
}

export const canResolveSupport = role => ['CENTER_MANAGER', 'RECEPTIONIST'].includes(role || '');
