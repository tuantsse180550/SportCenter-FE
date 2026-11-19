import { notificationsApi } from './notifications';
import { entityId, referenceId } from './operations';

// Coach feedback is delivered as in-app notifications (no dedicated BE model).
// The BE only lets a coach notify confirmed students of their own classes.
export const FEEDBACK_TITLE = 'Nhận xét từ HLV';

/**
 * Confirmed students of a class (or one of them) from /api/coaches/my-students rows.
 * target: 'class' | 'member' → [{ memberId, userId, fullName }]
 */
export function feedbackRecipients(rows, target, classId, memberId = '') {
  const seen = new Set();
  return rows.flatMap(row => {
    const member = row.member && typeof row.member === 'object' ? row.member : undefined;
    const id = member ? entityId(member) : '';
    const userId = member ? referenceId(member.userId) : '';
    if (!member || !id || !userId || referenceId(row.class) !== classId || seen.has(id) || (target === 'member' && id !== memberId)) return [];
    seen.add(id);
    return [{ memberId: id, userId, fullName: String(member.fullName || '') }];
  });
}

export const feedbackTitle = ({ target, className }) => `${FEEDBACK_TITLE} · ${target === 'class' ? 'Cả lớp' : 'Cá nhân'} · ${className}`.slice(0, 200);
export const feedbackMessage = ({ content, rating }) => `${content.trim()}${rating ? `\nĐánh giá: ${rating}/5` : ''}`;

export function validateFeedback(input) {
  if (!input.classId) return 'Chọn lớp bạn phụ trách.';
  if (input.target === 'member' && !input.memberId) return 'Chọn học viên nhận xét.';
  if (input.content.trim().length < 5) return 'Nhập nội dung nhận xét (ít nhất 5 ký tự).';
  if (input.rating !== undefined && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)) return 'Điểm đánh giá từ 1 đến 5.';
  return '';
}

/**
 * One call to the coach endpoint: the whole class, or the one student → { sent, failed, error }.
 * (POST /api/notifications is for manager/receptionist only and answers 403 to a coach.)
 */
export async function sendFeedback(token, recipients, input) {
  const title = feedbackTitle(input);
  const message = feedbackMessage(input);
  const target = input.target === 'class' ? { classId: input.classId } : { memberId: recipients[0]?.memberId || input.memberId };
  try {
    const result = await notificationsApi.coach(token, { ...target, title, message });
    return { sent: Number(result?.recipients) || recipients.length, failed: [], error: '' };
  } catch (error) {
    return { sent: 0, failed: recipients, error: error instanceof Error ? error.message : '' };
  }
}

export const isFeedback = item => String(item.title || '').startsWith(FEEDBACK_TITLE);
