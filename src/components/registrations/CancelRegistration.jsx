import ConfirmButton from '../common/ConfirmButton';
import { classRegistrationsApi, entityId, referenceId } from '../../api/operations';
import { paymentsApi } from '../../api/payments';

/** Cancels a PENDING_PAYMENT registration after re-checking it has no successful payment. */
export default function CancelRegistration({ item, token, onCancelled }) {
  async function cancel() {
    const [registrations, payments] = await Promise.all([classRegistrationsApi.list(token), paymentsApi.list(token)]);
    const current = registrations.find(record => entityId(record) === entityId(item));
    const paid = payments.some(payment => referenceId(payment.classRegistrationId) === entityId(item) && payment.status === 'SUCCESS');
    if (current?.status !== 'PENDING_PAYMENT' || paid) {
      throw new Error('Đăng ký không còn chờ thanh toán hoặc đã có giao dịch thành công. Làm mới trang và liên hệ trung tâm để được hỗ trợ.');
    }
    await classRegistrationsApi.update(token, entityId(item), { classId: referenceId(current.classId), memberId: referenceId(current.memberId), status: 'CANCELLED' });
  }
  return (
    <ConfirmButton
      label="Hủy đăng ký lớp" small={false}
      title="Hủy đăng ký lớp này?"
      description="Đăng ký chuyển sang trạng thái đã hủy. Thao tác này không tự hoàn tiền."
      confirmLabel="Xác nhận hủy" cancelLabel="Giữ đăng ký"
      onConfirm={cancel} onDone={onCancelled}
    />
  );
}
