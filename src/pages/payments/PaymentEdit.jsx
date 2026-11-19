import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useActorProfile } from '../../hooks/useActorProfile';
import { classRegistrationsApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { canManagePayments, currency, ownPayments, pendingPaymentForRegistration, payableRegistrations, paymentMethods, paymentsApi, registrationFor } from '../../api/payments';
import { enrollmentSteps } from '../../utils/enrollment';
import { withQuery } from '../../utils/url';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import ChoiceGroup from '../../components/common/ChoiceGroup';
import FlowSteps from '../../components/common/FlowSteps';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';
import PaymentActions from '../../components/payments/PaymentActions';
import PaymentManagement from '../../components/payments/PaymentManagement';

function PaymentForm({ token, item, registrations, selectedId, member, staffPayos, registrationPending, onRefresh }) {
  const navigate = useNavigate();
  const [registrationId, setRegistrationId] = useState(item ? referenceId(item.classRegistrationId) : selectedId || '');
  const [method, setMethod] = useState(item?.paymentMethod || (member ? 'ONLINE' : 'CASH'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function save() {
    if (pending.current) return;
    if (!item && !registrations.some(record => entityId(record) === registrationId)) { setError('Chọn đăng ký lớp đang chờ thanh toán.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      if (item) { await paymentsApi.update(token, entityId(item), method); onRefresh(); return; }
      const created = await paymentsApi.create(token, registrationId, method);
      if (!entityId(created)) throw new Error('Máy chủ chưa trả về mã yêu cầu thanh toán. Mở danh sách để kiểm tra trước khi tạo lại.');
      navigate(withQuery('/payment-edit', { id: entityId(created) }), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  return (
    <div className="stack">
      {item ? (
        <section className="card">
          <p className="eyebrow">SỐ TIỀN TỪ HỆ THỐNG</p>
          <p className="title">{currency(item.amount)}</p>
          <p className="body">Bạn chỉ có thể đổi phương thức khi yêu cầu còn chờ thanh toán.</p>
        </section>
      ) : (
        <section className="card">
          <h2 className="heading">Chọn đăng ký lớp</h2>
          {registrations.length ? (
            <ChoiceGroup
              options={registrations.map(record => ({ value: entityId(record), label: `${referenceLabel(record.classId)} · ${referenceLabel(record.memberId)}` }))}
              value={registrationId} onChange={setRegistrationId} disabled={busy}
            />
          ) : <p className="body">Không có đăng ký chờ thanh toán. Đăng ký lớp trước hoặc kiểm tra yêu cầu thanh toán đã tạo.</p>}
        </section>
      )}
      <section className="card">
        <ChoiceGroup label="Phương thức thanh toán" options={paymentMethods} value={method} onChange={setMethod} disabled={busy} />
        <p className="body small">Tạo yêu cầu chưa trừ tiền và chưa xác nhận đăng ký. Số tiền được lấy từ học phí khóa học; tiền mặt/chuyển khoản do lễ tân xác nhận khi nhận tiền.</p>
        {error && <p role="alert" className="error">{error}</p>}
        <div><Button disabled={busy || (!item && !registrations.length)} title={busy ? 'Đang lưu…' : item ? 'Lưu phương thức' : 'Tạo yêu cầu thanh toán'} onPress={save} /></div>
      </section>
      {item && registrationPending && (member || (staffPayos && item.paymentMethod === 'ONLINE')) && (
        <>
          {method !== item.paymentMethod && <p className="body">Lưu phương thức mới trước khi mở thanh toán.</p>}
          <PaymentActions key={`${entityId(item)}:${item.paymentMethod}`} item={item} token={token} allowSimulation={member} onRefresh={onRefresh} disabled={busy || method !== item.paymentMethod} onBusyChange={setBusy} />
        </>
      )}
    </div>
  );
}

// Remount on every ?id / ?registrationId change so data is fetched fresh
// (e.g. right after creating a payment we land on ?id=<new>).
export default function PaymentEdit() {
  const [params] = useSearchParams();
  return <PaymentEditView key={params.toString()} id={params.get('id') || ''} registrationId={params.get('registrationId') || ''} />;
}

function PaymentEditView({ id, registrationId }) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const actor = useActorProfile(member);
  const actorId = actor.data ? entityId(actor.data) : '';

  const load = useCallback(async () => {
    const [payments, registrations] = await Promise.all([paymentsApi.list(token), classRegistrationsApi.list(token)]);
    const visible = member ? registrations.filter(record => referenceId(record.memberId) === actorId) : registrations;
    return { payments: member ? ownPayments(payments, registrations, actorId) : payments, registrations: visible };
  }, [token, member, actorId]);
  const query = useApiQuery(load, canManagePayments(user.role) && (!member || !!actorId));

  if (!canManagePayments(user.role)) return <AccessScreen denied />;
  const payments = query.data?.payments || [];
  const existing = payments.find(record => !!registrationId && record.status === 'SUCCESS' && referenceId(record.classRegistrationId) === registrationId)
    || pendingPaymentForRegistration(payments, registrationId);
  const selectedPaymentId = id || (existing ? entityId(existing) : '');
  const item = payments.find(record => entityId(record) === selectedPaymentId);
  const registration = item ? registrationFor(item, query.data?.registrations || []) : undefined;
  const alreadyPaid = !!item && payments.some(record => record.status === 'SUCCESS' && referenceId(record.classRegistrationId) === referenceId(item.classRegistrationId));
  const eligible = payableRegistrations(query.data?.registrations || [], payments);
  const closed = item && (item.status !== 'PENDING' || registration?.status === 'CANCELLED' || alreadyPaid);

  return (
    <Screen>
      <Link className="link" to="/payments">← Thanh toán</Link>
      <FlowSteps labels={enrollmentSteps} current={4} />
      <h1 className="title">{selectedPaymentId ? 'Chi tiết thanh toán' : 'Yêu cầu thanh toán'}</h1>
      <QueryStatus loading={query.loading || (member && actor.loading)} error={query.error || (member ? actor.error : null)} retry={() => { query.reload(); actor.reload(); }} />
      {member && actor.error && <Link className="link" to="/profile">Hoàn thiện hồ sơ hội viên →</Link>}
      {item && <PaymentManagement key={`management:${entityId(item)}`} item={item} token={token} role={user.role} registration={registration} onRefresh={query.reload} />}
      {query.data && (selectedPaymentId && !item ? (
        <p className="error">Không tìm thấy thanh toán thuộc tài khoản này.</p>
      ) : closed ? (
        <section className="card">
          <h2 className="heading">{alreadyPaid ? 'Đăng ký đã có thanh toán thành công' : item.status === 'FAILED' ? 'Thanh toán chưa thành công' : 'Đăng ký không còn chờ thanh toán'}</h2>
          <p className="body">{currency(item.amount)} · {referenceLabel(registration?.classId)}</p>
          {registration && <div><Button title={registration.status === 'CONFIRMED' ? 'Xem đăng ký và lịch học →' : 'Quay lại đăng ký để tiếp tục →'} onPress={() => navigate(withQuery('/registration-detail', { id: entityId(registration) }))} /></div>}
        </section>
      ) : (
        <PaymentForm key={selectedPaymentId || 'new'} token={token} item={item} registrations={eligible} selectedId={registrationId} member={member} staffPayos={user.role === 'RECEPTIONIST'} registrationPending={registration?.status === 'PENDING_PAYMENT'} onRefresh={query.reload} />
      ))}
    </Screen>
  );
}
