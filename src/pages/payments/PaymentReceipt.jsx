import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { canManagePayments, paymentsApi } from '../../api/payments';
import { receiptRows } from '../../utils/payment-receipt';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';

/** Receipt / invoice. The BE HTML is parsed to text rows, never injected. Print via browser. */
export default function PaymentReceipt() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const { user, token } = useAuth();
  const load = useCallback(async () => receiptRows(await paymentsApi.receipt(token, id)), [token, id]);
  const query = useApiQuery(load, !!id && canManagePayments(user.role));
  const [printedAt] = useState(() => new Date().toLocaleString('vi-VN'));

  if (!canManagePayments(user.role)) return <AccessScreen denied />;
  return (
    <Screen>
      <Link className="link no-print" to="/payments">← Thanh toán</Link>
      {!id ? <p className="error">Thiếu mã thanh toán.</p> : <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />}
      {query.data && (
        <>
          <section className="card receipt">
            <div className="receipt-head">
              <span className="brand-mark" aria-hidden="true">⌁</span>
              <div>
                <h1 className="heading">ActiveHub · Sport Center</h1>
                <p className="body small">Hóa đơn / biên nhận thanh toán</p>
              </div>
            </div>
            <table className="table receipt-table">
              <tbody>
                {query.data.map(([label, value], index) => (
                  <tr key={index}><th scope="row">{label}</th><td>{value}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="body small">In ngày {printedAt}</p>
          </section>
          <div className="no-print"><Button title="In / Lưu PDF" onPress={() => window.print()} /></div>
        </>
      )}
    </Screen>
  );
}
