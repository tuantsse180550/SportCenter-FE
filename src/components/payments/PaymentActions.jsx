import { useRef, useState } from 'react';
import Button from '../common/Button';
import { Icon } from '../common/Icon';
import { entityId } from '../../api/operations';
import { currency, paymentsApi, validatePaymentUrl } from '../../api/payments';

const demoEnabled = import.meta.env.VITE_ENABLE_PAYMENT_DEMO === 'true';

/**
 * Member-side actions for a PENDING payment: payOS checkout (BE PAYMENT_MODE=payos), status check and
 * (when VITE_ENABLE_PAYMENT_DEMO=true and BE PAYMENT_MODE=mock) a simulator.
 * payOS opens in this tab (a new tab would not keep the sessionStorage login). After paying or
 * cancelling, payOS returns to the BE, which confirms with payOS and redirects to /payment-result.
 */
export default function PaymentActions({ item, token, onRefresh, disabled = false, allowSimulation = true, onBusyChange }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [confirm, setConfirm] = useState(null); // 'SUCCESS' | 'FAILED' | null

  function begin() {
    if (pending.current || disabled) return false;
    pending.current = true; setBusy(true); onBusyChange?.(true); setError(''); setNotice('');
    return true;
  }
  function finish() { pending.current = false; setBusy(false); onBusyChange?.(false); }

  async function prepare() {
    if (!begin()) return;
    try { const result = await paymentsApi.checkout(token, entityId(item)); setCheckoutUrl(validatePaymentUrl(result.paymentUrl)); }
    catch (e) { setError(e.message); }
    finally { finish(); }
  }
  async function simulate(status) {
    if (!begin()) return;
    try { await paymentsApi.simulate(token, entityId(item), status); setConfirm(null); onRefresh(); }
    catch (e) { setError(e.message); }
    finally { finish(); }
  }
  async function checkStatus(quiet = false) {
    if (!begin()) return;
    try {
      const result = await paymentsApi.status(token, entityId(item));
      if (result?.status === 'PENDING') {
        if (!quiet) setNotice('Chưa nhận được thanh toán. Nếu bạn vừa trả tiền, đợi vài giây rồi kiểm tra lại.');
      } else {
        onRefresh();
      }
    } catch (e) { setError(e.message); }
    finally { finish(); }
  }


  const locked = busy || disabled;
  return (
    <section className="card">
      <div className="pay-heading">
        <span className="metric-icon orange"><Icon name="wallet" size={20} /></span>
        <div>
          <h2 className="heading">Tiếp tục thanh toán</h2>
          <p className="body small">Số tiền: <b>{currency(item.amount)}</b></p>
        </div>
      </div>
      {item.paymentMethod === 'ONLINE' ? (
        checkoutUrl ? (
          <>
            <p className="body">Trang thanh toán payOS đã sẵn sàng. Quét mã QR bằng ứng dụng ngân hàng hoặc chuyển khoản theo thông tin trên trang. Thanh toán xong bạn sẽ được đưa về trang kết quả. Liên kết có hiệu lực 60 phút.</p>
            <a className="btn" href={checkoutUrl} rel="noreferrer" aria-disabled={locked}>
              <Icon name="arrow" size={17} /> Đến trang thanh toán payOS
            </a>
          </>
        ) : (
          <>
            <p className="body">Thanh toán trực tuyến qua payOS bằng mã VietQR — hỗ trợ mọi ứng dụng ngân hàng.</p>
            <div><Button icon="wallet" disabled={locked} onPress={prepare}>{busy ? 'Đang tạo liên kết…' : 'Thanh toán qua payOS'}</Button></div>
          </>
        )
      ) : (
        <p className="body">Liên hệ lễ tân để được hướng dẫn thanh toán tiền mặt hoặc chuyển khoản tại trung tâm.</p>
      )}
      <p className="body small">Nếu đã thanh toán mà trạng thái chưa đổi, bấm kiểm tra để cập nhật.</p>
      <div><Button secondary small icon="repeat" disabled={locked} onPress={() => checkStatus(false)}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái'}</Button></div>
      {notice && <div className="alert-box amber" role="status"><Icon name="clock" size={18} /><p>{notice}</p></div>}
      {demoEnabled && allowSimulation && (
        <div className="demo-box stack-sm">
          <p className="eyebrow">KIỂM THỬ · KHÔNG THU TIỀN</p>
          <p className="body small">Chỉ dùng với BE PAYMENT_MODE=mock. Kết quả mô phỏng có thể xác nhận đăng ký lớp.</p>
          {confirm ? (
            <>
              <p className="body">Xác nhận mô phỏng {confirm === 'SUCCESS' ? 'thành công và xác nhận đăng ký lớp' : 'thất bại'}?</p>
              <div className="row-actions">
                <Button disabled={locked} title="Xác nhận mô phỏng" onPress={() => simulate(confirm)} />
                <Button secondary disabled={locked} title="Hủy" onPress={() => setConfirm(null)} />
              </div>
            </>
          ) : (
            <div className="row-actions">
              <Button secondary small disabled={locked} title="Mô phỏng thành công" onPress={() => setConfirm('SUCCESS')} />
              <Button secondary small disabled={locked} title="Mô phỏng thất bại" onPress={() => setConfirm('FAILED')} />
            </div>
          )}
        </div>
      )}
      {error && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>{error}</p></div>}
    </section>
  );
}
