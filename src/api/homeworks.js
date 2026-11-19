import { request } from './client';

export const homeworksApi = {
  my: token => request('/api/homeworks/my', { token }),
  // input: { classId?, memberId?, title, description, dueDate?, attachments? } → { homework, recipientCount, notificationCount }
  create: (token, input) => request('/api/homeworks', { token, body: input }),
};
