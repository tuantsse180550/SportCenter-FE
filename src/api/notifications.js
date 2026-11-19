import { request, enc } from './client';
import { referenceId } from './operations';

export const ownNotifications = (items, userId) => items.filter(item => !!userId && referenceId(item.userId) === userId);

export const notificationsApi = {
  my: token => request('/api/notifications/my', { token }),
  /** CENTER_MANAGER / RECEPTIONIST only. sentBy: 'me' (sent by me) | 'system' (automatic) | '' (everything). */
  list: (token, sentBy = '') => request(`/api/notifications${sentBy ? `?sentBy=${enc(sentBy)}` : ''}`, { token }),
  /** CENTER_MANAGER / RECEPTIONIST only: notify any user. */
  create: (token, { userId, title, message }) => request('/api/notifications', { token, body: { userId, title: title.trim(), message: message.trim() } }),
  /**
   * COACH only: notify a whole class they teach (classId) or one confirmed student (memberId, a
   * member profile id). The BE checks the class/student belongs to the coach and signs the message.
   * → { recipients }
   */
  coach: (token, { classId, memberId, title, message }) => request('/api/notifications/coach', {
    token, body: { ...(classId ? { classId } : { memberId }), title: title.trim(), message: message.trim() },
  }),
  setRead: (token, id, isRead) => request(`/api/notifications/${enc(id)}`, { token, method: 'PUT', body: { isRead } }),
};

export const canSendNotification = role => ['CENTER_MANAGER', 'COACH', 'RECEPTIONIST'].includes(role || '');
/** Manager / receptionist may list every notification of the center (GET /api/notifications). */
export const canSeeSentNotifications = role => ['CENTER_MANAGER', 'RECEPTIONIST'].includes(role || '');
/** Notifications the center sent to other people, newest first (the ones addressed to me are in "my"). */
export const sentNotifications = (items, userId) => (items || [])
  .filter(item => referenceId(item.userId) !== userId)
  .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
