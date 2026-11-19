import { classRegistrationsApi, entityId, referenceId } from './operations';

// Only staff may move CANCELLED → PENDING_PAYMENT (PUT /api/class-registrations/:id).
// A member re-registering is refused by the BE once the registration has payment history.
export const canReopenRegistration = role => role === 'RECEPTIONIST' || role === 'CENTER_MANAGER';

/** Re-checks the latest state, then reopens the registration so it awaits payment again. */
export async function reopenRegistration(token, registrationId) {
  const current = (await classRegistrationsApi.list(token)).find(item => entityId(item) === registrationId);
  if (!current) throw new Error('Không tìm thấy đăng ký. Làm mới trang rồi thử lại.');
  if (current.status !== 'CANCELLED') throw new Error('Đăng ký không còn ở trạng thái đã hủy. Làm mới trang để xem trạng thái mới nhất.');
  return classRegistrationsApi.update(token, registrationId, { classId: referenceId(current.classId), memberId: referenceId(current.memberId), status: 'PENDING_PAYMENT' });
}
