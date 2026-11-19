import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { currency, paymentMethods, paymentsApi, registrationFor } from '../../api/payments';
import { classRegistrationsApi, entityId, referenceLabel } from '../../api/operations';
import { roleHome } from '../../utils/staff-navigation';
import { withQuery } from '../../utils/url';
import Button from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import QueryStatus from '../../components/common/QueryStatus';

const MAX_AUTO_CHECKS = 5;
const dateTime = value => (value ? new Date(String(value)).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }) : '—');

/**
 * Landing page after payOS (BE /api/payments/payos/return redirects here with ?id=).
 * The status always comes from the BE, which confirms it with payOS; the URL is never trusted.
 */
export default function PaymentResult() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const { user, token } = useAuth();
  const [attempt, setAttempt] = useState(0);

  // Keeps the last result on screen while re-checking, so the card does not flash.
  const [result, setResult] = useState({ data: null, error: null, loading: !!id });
  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    Promise.all([paymentsApi.status(token, id), paymentsApi.list(token), classRegistrationsApi.list(token)])
      .then(([status, payments, registrations]) => {
        const payment = payments.find(item => entityId(item) === id) || null;
        if (active) setResult({ data: { status, payment, registration: payment ? registrationFor(payment, registrations) : null }, error: null, loading: false });
      })
      .catch(error => { if (active) setResult(current => ({ ...current, error, loading: false })); });
    return () => { active = false; };
  }, [token, id, attempt]);
  // The BE answers 403/404 when the payment belongs to another account (e.g. paid while signed in as someone else).
  const error = result.error && [403, 404].includes(result.error.status)
    ? new Error('Không tìm thấy giao dịch này trong tài khoản đang đăng nhập. Hãy đăng nhập đúng tài khoản đã thanh toán rồi mở lại mục Thanh toán.')
    : result.error;
  const query = { ...result, error, reload: () => setAttempt(value => value + 1) };
  const data = result.data;
  const state = data?.status?.status;

  // payOS can take a few seconds to settle: re-check a PENDING payment automatically.
  useEffect(() => {
    if (state !== 'PENDING' || attempt >= MAX_AUTO_CHECKS) return undefined;
    const timer = setTimeout(() => setAttempt(value => value + 1), 3000);
    return () => clearTimeout(timer);
  }, [state, attempt]);

  const payment = data?.payment;
  const registration = data?.registration;

  // Paid and enrolled: continue in the enrollment flow, where the registration page shows the success notice.
  const enrolledId = state === 'SUCCESS' && registration && data.status.registrationStatus === 'CONFIRMED' ? entityId(registration) : '';
  useEffect(() => {
    if (enrolledId) navigate(withQuery('/registration-detail', { id: enrolledId, paid: id }), { replace: true });
  }, [enrolledId, id, navigate]);
  const view = state === 'SUCCESS'
    ? { tone: 'green', icon: 'checkCircle', title: 'Thanh toán thành công', text: data.status.registrationStatus === 'CANCELLED'
      ? 'Đã nhận tiền nhưng đăng ký lớp đã bị hủy. Vui lòng liên hệ lễ tân để được hoàn tiền.'
      : 'Đăng ký lớp của bạn đã được xác nhận. Lịch học đã có trong mục Lịch của tôi.' }
    : state === 'FAILED'
      ? { tone: 'red', icon: 'alert', title: 'Thanh toán chưa thành công', text: 'Giao dịch đã bị hủy hoặc hết hạn, bạn chưa bị trừ tiền. Hãy tạo yêu cầu thanh toán mới để tiếp tục.' }
      : { tone: 'amber', icon: 'clock', title: 'Đang chờ xác nhận', text: attempt < MAX_AUTO_CHECKS
        ? 'Hệ thống đang xác nhận giao dịch với payOS…'
        : 'Chưa nhận được kết quả. Nếu bạn đã chuyển khoản, đợi một lát rồi kiểm tra lại.' };

  return (
    <div className="screen payment-result">
      {!id && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>Thiếu mã thanh toán.</p></div>}
      <QueryStatus loading={query.loading && !data} error={query.error} retry={query.reload} />
      {data && (
        <section className={`card result-card ${view.tone}`}>
          <span className={`result-icon ${view.tone}`}><Icon name={view.icon} size={34} /></span>
          <h1>{view.title}</h1>
          <p>{view.text}</p>
          {payment && <strong className="result-amount">{currency(payment.amount)}</strong>}
          <div className="detail-grid result-details">
            <div><span>Lớp học</span><b>{referenceLabel(registration?.classId)}</b></div>
            <div><span>Phương thức</span><b>{paymentMethods.find(item => item.value === payment?.paymentMethod)?.label || '—'}</b></div>
            <div><span>Thời gian</span><b>{dateTime(data.status.paymentDate || payment?.updatedAt)}</b></div>
            <div><span>Mã giao dịch</span><b className="mono">{id.slice(-8).toUpperCase()}</b></div>
          </div>
          <div className="row-actions result-actions">
            {state === 'SUCCESS' && <Button icon="file" onPress={() => navigate(withQuery('/payment-receipt', { id }))}>Xem hóa đơn</Button>}
            {state === 'SUCCESS' && registration && <Button secondary icon="calendar" onPress={() => navigate(withQuery('/registration-detail', { id: entityId(registration) }))}>Xem lịch học</Button>}
            {state === 'FAILED' && <Button icon="repeat" onPress={() => navigate(registration ? withQuery('/registration-detail', { id: entityId(registration) }) : '/payments')}>Thanh toán lại</Button>}
            {state === 'PENDING' && <Button icon="repeat" disabled={query.loading} onPress={() => setAttempt(value => value + 1)}>Kiểm tra lại</Button>}
            <Button secondary onPress={() => navigate(user.role === 'MEMBER' ? '/payments' : roleHome(user.role))}>Về trang thanh toán</Button>
          </div>
        </section>
      )}
    </div>
  );
}
