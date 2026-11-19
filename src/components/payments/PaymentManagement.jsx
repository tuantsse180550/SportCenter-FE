import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { entityId } from '../../api/operations';
import { currency, paymentsApi } from '../../api/payments';
import { withQuery } from '../../utils/url';

/**
 * Status polling (every 10s while PENDING and the tab is visible), desk confirmation
 * for cash/transfer (staff), and receipt link once SUCCESS.
 */
export default function PaymentManagement({ item, token, role, registration, onRefresh }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const recording = useRef(false);
  const id = entityId(item);

  useEffect(() => {
    if (item.status !== 'PENDING') return undefined;
    let active = true;
    let checking = false;
    async function check() {
      if (!active || checking || recording.current || document.visibilityState !== 'visible') return;
      checking = true;
      try {
        const result = await paymentsApi.status(token, id);
        if (active && (result.status !== item.status || (registration && result.registrationStatus !== registration.status))) onRefresh();
      } catch { /* Manual check reports errors; background polling stays quiet. */ }
      finally { checking = false; }
    }
    check();
    const timer = setInterval(check, 10000);
    document.addEventListener('visibilitychange', check);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [id, token, item.status, registration, onRefresh]);

  async function run(record) {
    if (recording.current) return;
    recording.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (record) { await paymentsApi.record(token, id); setConfirm(false); }
      else {
        const result = await paymentsApi.status(token, id);
        setMessage(result.status === 'SUCCESS' ? 'Đã thanh toán thành công.' : result.status === 'FAILED' ? 'Thanh toán thất bại. Quay lại đăng ký để tạo yêu cầu mới.' : 'Chưa có xác nhận thanh toán từ hệ thống.');
      }
      onRefresh();
    } catch (e) {
      setError(e.message);
      if (record) onRefresh();
    } finally {
      recording.current = false; setBusy(false);
    }
  }

  const canRecord = ['RECEPTIONIST', 'CENTER_MANAGER'].includes(role) && item.status === 'PENDING'
    && ['CASH', 'BANK_TRANSFER'].includes(String(item.paymentMethod)) && registration?.status === 'PENDING_PAYMENT';

  return (
    <section className="card">
      {item.status === 'PENDING' && <Button secondary disabled={busy} title="Kiểm tra trạng thái giao dịch" onPress={() => run(false)} />}
      {canRecord && (confirm ? (
        <>
          <p className="body">Xác nhận đã nhận đủ <strong>{currency(item.amount)}</strong> bằng {item.paymentMethod === 'CASH' ? 'tiền mặt' : 'chuyển khoản'}? Thao tác này xác nhận đăng ký lớp.</p>
          <div className="row-actions">
            <Button disabled={busy} title={busy ? 'Đang xác nhận…' : 'Đã nhận tiền · Xác nhận'} onPress={() => run(true)} />
            <Button secondary disabled={busy} title="Hủy" onPress={() => setConfirm(false)} />
          </div>
        </>
      ) : <Button title="Xác nhận đã thu tiền" onPress={() => setConfirm(true)} />)}
      {item.status === 'SUCCESS' && <Button title="Xem / in hóa đơn" onPress={() => navigate(withQuery('/payment-receipt', { id }))} />}
      {message && <p role="status" className="body">{message}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
  );
}
