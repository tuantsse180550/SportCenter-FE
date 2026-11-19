import { useCallback, useState } from 'react';
import { confirmRegistrationAtDesk } from '../../api/checkin';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActorProfile } from '../../hooks/useActorProfile';
import { useApiQuery } from '../../hooks/useApiQuery';
import { classRegistrationsApi, classesApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { paymentsApi, pendingPaymentForRegistration, currency, isVoidedPayment, paymentStatusLabel } from '../../api/payments';
import { canReopenRegistration, reopenRegistration } from '../../api/registration-reopen';
import ConfirmButton from '../../components/common/ConfirmButton';
import { enrollmentRoles, enrollmentSteps } from '../../utils/enrollment';
import FlowSteps from '../../components/common/FlowSteps';
import { Icon } from '../../components/common/Icon';
import { statusLabels } from '../../utils/resource-display';
import { withQuery, workspacePath } from '../../utils/url';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';
import CancelRegistration from '../../components/registrations/CancelRegistration';

const DESK_METHODS = [['CASH', 'Tiền mặt'], ['BANK_TRANSFER', 'Chuyển khoản']];

/** Front desk: collect the fee and confirm the registration, which turns on the member's QR pass. */
function DeskConfirm({ token, registrationId, amount, onDone }) {
  const [method, setMethod] = useState('CASH');
  const label = DESK_METHODS.find(([value]) => value === method)[1].toLowerCase();
  return (
    <section className="card desk-confirm">
      <h2 className="heading">Xác nhận đăng ký tại quầy</h2>
      <p className="body">Thu học phí <b>{currency(amount)}</b> rồi xác nhận. Hội viên nhận thông báo và có ngay mã QR ra/vào trung tâm.</p>
      <div className="segmented" role="group" aria-label="Hình thức thu tiền">
        {DESK_METHODS.map(([value, text]) => (
          <button type="button" key={value} className={method === value ? 'active' : ''} aria-pressed={method === value} onClick={() => setMethod(value)}>{text}</button>
        ))}
      </div>
      <div>
        <ConfirmButton
          label="Xác nhận đăng ký" secondary={false} small={false} icon="checkCircle"
          title="Đã thu tiền và xác nhận đăng ký?"
          description={`Ghi nhận ${currency(amount)} (${label}) và xác nhận đăng ký. Thao tác này kích hoạt mã QR ra/vào cho hội viên.`}
          confirmLabel="Đã thu tiền, xác nhận" busyLabel="Đang xác nhận…" cancelLabel="Chưa"
          onConfirm={() => confirmRegistrationAtDesk(token, registrationId, method)} onDone={onDone}
        />
      </div>
    </section>
  );
}

export default function RegistrationDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const actor = useActorProfile(member);
  const actorId = actor.data ? entityId(actor.data) : '';

  const load = useCallback(async () => {
    const [registrations, classes, payments] = await Promise.all([classRegistrationsApi.list(token), classesApi.list(token), paymentsApi.list(token)]);
    const registration = registrations.find(item => entityId(item) === id && (!member || referenceId(item.memberId) === actorId));
    return {
      registration,
      classInfo: classes.find(item => entityId(item) === referenceId(registration?.classId)),
      payments: payments.filter(item => referenceId(item.classRegistrationId) === id),
    };
  }, [token, id, member, actorId]);
  const query = useApiQuery(load, enrollmentRoles.includes(user.role) && (!member || !!actorId));

  if (!enrollmentRoles.includes(user.role)) return <AccessScreen denied />;
  const item = query.data?.registration;
  const paid = query.data?.payments.some(record => record.status === 'SUCCESS');
  const payment = pendingPaymentForRegistration(query.data?.payments || [], id);
  // Arriving from a finished online payment (?paid=<paymentId>): only trust it when the BE data agrees.
  const paidPayment = query.data?.payments.find(record => entityId(record) === params.get('paid') && record.status === 'SUCCESS');
  const justEnrolled = !!paidPayment && item?.status === 'CONFIRMED';

  return (
    <Screen>
      <Link className="link" to={workspacePath('class-registrations')}>← {member ? 'Đăng ký của tôi' : 'Danh sách đăng ký'}</Link>
      {justEnrolled && <FlowSteps labels={enrollmentSteps} current={enrollmentSteps.length} />}
      <h1 className="title">{justEnrolled ? 'Đăng ký thành công' : 'Thông tin đăng ký'}</h1>
      <QueryStatus loading={query.loading || (member && actor.loading)} error={query.error || (member ? actor.error : null)} retry={() => { actor.reload(); query.reload(); }} />
      {query.data && !item && <p className="error">Không tìm thấy đăng ký trong phạm vi tài khoản.</p>}
      {item && (
        <>
          {justEnrolled && (
            <section className="card enroll-success" role="status">
              <span className="result-icon green"><Icon name="checkCircle" size={34} /></span>
              <h2>Chúc mừng! Bạn đã đăng ký thành công</h2>
              <p>
                Thanh toán <b>{currency(paidPayment.amount)}</b> cho lớp <b>{query.data.classInfo ? String(query.data.classInfo.name) : referenceLabel(item.classId)}</b> đã được xác nhận.
                Lịch học của lớp đã có trong mục Lịch của tôi.
              </p>
              <div className="row-actions result-actions">
                <Button icon="calendar" onPress={() => navigate(workspacePath('schedules'))}>Xem lịch học của tôi</Button>
                <Button secondary icon="file" onPress={() => navigate(withQuery('/payment-receipt', { id: entityId(paidPayment) }))}>Xem hóa đơn</Button>
                <Button secondary icon="plus" onPress={() => navigate('/enroll')}>Đăng ký lớp khác</Button>
              </div>
            </section>
          )}
          <section className="card">
            <span className={`badge status-${item.status}`}>{statusLabels[item.status]}</span>
            <h2 className="heading">{query.data.classInfo ? String(query.data.classInfo.name) : referenceLabel(item.classId)}</h2>
            <p className="body">Hội viên: {referenceLabel(item.memberId)}</p>
            <p className="body">Ngày đăng ký: {String(item.registeredAt || item.createdAt || '').slice(0, 10)}</p>
            {payment && item.status === 'PENDING_PAYMENT' && <p className="heading-sm">Chờ thanh toán: {currency(payment.amount)}</p>}
          </section>

          {item.status === 'PENDING_PAYMENT' && paid && (
            <section className="card">
              <p className="body">Đã có giao dịch thành công. Đang chờ đồng bộ trạng thái đăng ký; không tạo thanh toán mới. Làm mới hoặc liên hệ trung tâm.</p>
              <div><Button secondary small title="Kiểm tra lại" onPress={query.reload} /></div>
            </section>
          )}
          {item.status === 'PENDING_PAYMENT' && !paid && !member && (
            <DeskConfirm token={token} registrationId={entityId(item)} amount={payment ? payment.amount : item.priceSnapshot} onDone={query.reload} />
          )}
          {item.status === 'PENDING_PAYMENT' && !paid && (
            <>
              <p className="body">{member
                ? 'Đăng ký đang chờ lễ tân xác nhận. Thanh toán học phí tại quầy để lễ tân xác nhận, hoặc thanh toán online để được xác nhận ngay. Sau khi xác nhận, bạn có mã QR ra/vào trung tâm.'
                : 'Đăng ký đã lưu. Hội viên có thể thanh toán online, hoặc lễ tân thu tiền tại quầy và xác nhận ở trên.'}</p>
              <div className="row-actions">
                <Button title={payment ? 'Tiếp tục thanh toán →' : 'Chọn phương thức thanh toán →'} onPress={() => navigate(withQuery('/payment-edit', { registrationId: entityId(item) }))} />
                <CancelRegistration item={item} token={token} onCancelled={query.reload} />
              </div>
            </>
          )}
          {item.status === 'CONFIRMED' && (
            <>
              <p className="body">Hội viên đã được xác nhận trong lớp. Xem lịch học và theo dõi buổi tập tiếp theo.</p>
              <div className="row-actions">
                {member && <Button icon="qr" onPress={() => navigate('/checkin')}>Mã QR ra/vào</Button>}
                <Button secondary={member} title={member ? 'Xem lịch học của tôi →' : 'Xem lịch lớp →'} onPress={() => navigate(workspacePath('schedules', member ? {} : { classId: referenceId(item.classId) }))} />
                {member && <Button secondary title="Gửi yêu cầu hỗ trợ" onPress={() => navigate('/support')} />}
              </div>
              <p className="body small">Muốn đổi hoặc hủy lớp đã thanh toán, liên hệ trung tâm để xử lý quyền lợi và học phí.</p>
            </>
          )}
          {item.status === 'CANCELLED' && (
            <>
              {canReopenRegistration(user.role)
                ? <p className="body">Đăng ký đã hủy. Mở lại để hội viên tiếp tục thanh toán và tham gia lớp.</p>
                : <p className="body">Đăng ký đã hủy và không cần thanh toán. Muốn tham gia lại lớp này, vui lòng liên hệ trung tâm để được hỗ trợ.</p>}
              <div className="row-actions">
                {canReopenRegistration(user.role) && (
                  <ConfirmButton
                    label="Mở lại đăng ký" secondary={false} small={false}
                    title="Mở lại đăng ký lớp này?"
                    description={payment
                      ? `Đăng ký chuyển về chờ thanh toán. Yêu cầu thanh toán cũ ${currency(payment.amount)} sẽ được dùng lại: hội viên thanh toán online, hoặc lễ tân xác nhận thu tiền tại quầy.`
                      : 'Đăng ký chuyển về chờ thanh toán. Hội viên chỉ được xác nhận vào lớp sau khi thanh toán thành công.'}
                    confirmLabel="Xác nhận mở lại" busyLabel="Đang mở lại…" cancelLabel="Giữ trạng thái đã hủy"
                    onConfirm={() => reopenRegistration(token, entityId(item))} onDone={query.reload}
                  />
                )}
                <Button secondary title="Khám phá lớp khác" onPress={() => navigate('/enroll')} />
              </div>
            </>
          )}

          {!!query.data.payments.length && (
            <section className="card">
              <h2 className="heading">Lịch sử thanh toán</h2>
              {query.data.payments.map(record => (
                <div key={entityId(record)} className="list-row row-between">
                  <span className={isVoidedPayment(record, item) ? 'muted' : undefined}>{currency(record.amount)} · {paymentStatusLabel(record, item)}</span>
                  {record.status === 'SUCCESS' && <Link className="link" to={withQuery('/payment-receipt', { id: entityId(record) })}>Hóa đơn →</Link>}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </Screen>
  );
}
