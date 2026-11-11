import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { Button, InfoGrid, Modal, SelectField, Badge } from "./UI.jsx";
import { AsyncPanel, ErrorMessage } from "./AsyncPanel.jsx";
import { RegistrationBadge } from "./RegistrationBadge.jsx";
import { paymentService, formatters } from "../../services/index.js";
import { authService } from "../../services/api/authApi.js";
import { paymentApi } from "../../services/api/resources.js";
import { useMutation, useQuery } from "../../store/useQuery.js";

export function RegistrationPaymentModal({ registrationId, confirmReceived = false, customerView = false, onClose }) {
  const [busy, setBusy] = useState(false);
  const query = useQuery(() => paymentService.getRegistrationPayment(registrationId), [registrationId]);
  return <Modal title="Thanh toán đăng ký lớp học" onClose={busy ? () => {} : onClose}><AsyncPanel query={query}>{data => data.registration ? <PaymentForm data={data} confirmReceived={confirmReceived} customerView={customerView} reload={query.reload} setBusy={setBusy} /> : <p>Không tìm thấy đăng ký.</p>}</AsyncPanel></Modal>;
}
export function RegistrationPaymentSummary({ registration, coursePrice, customerView }) {
  return <InfoGrid items={[
    ["Khóa học", registration.classItem?.course?.name],
    ["Lớp học", registration.classItem?.name],
    ...(!customerView ? [["Thành viên", registration.member?.name]] : []),
    ["Học phí đã chốt / học viên", Number.isFinite(coursePrice) ? formatters.money(coursePrice) : "Chưa có giá từ hệ thống"],
  ]} />;
}
function PaymentForm({ data, confirmReceived, customerView, reload, setBusy }) {
  const { registration, payments, coursePrice } = data;
  const existing = payments.find(p => p.status === "PENDING");
  const [paymentMethod, setMethod] = useState(confirmReceived ? "CASH" : "ONLINE");
  const [message, setMessage] = useState("");
  const mutation = useMutation();
  const isMember = authService.getCurrentUser()?.role === "MEMBER";
  const run = action => mutation.run(async () => {
    setBusy(true);
    try { return await action(); } finally { setBusy(false); }
  });
  const create = () => run(async () => {
    const receipt = await paymentService.recordPayment({ classRegistrationId: registration.id, paymentMethod });
    setMessage("Đã tạo giao dịch " + uiLabel(receipt.payment.status) + ". " + (receipt.refreshError || "Đăng ký chỉ được xác nhận sau khi hệ thống ghi nhận thanh toán thành công."));
    reload();
    if (customerView) {
      const { paymentUrl } = await paymentService.createVnpayUrl(receipt.payment.id);
      window.location.assign(paymentUrl);
    }
  });
  const checkout = id => run(async () => {
    try {
      const { paymentUrl } = await paymentService.createVnpayUrl(id);
      window.location.assign(paymentUrl);
    } finally { reload(); }
  });
  return <><RegistrationPaymentSummary registration={registration} coursePrice={coursePrice} customerView={customerView} />
    <p>Đăng ký: <RegistrationBadge status={registration.status} /></p>
    <p>Giao dịch này chỉ thanh toán cho lớp và đăng ký ở trên. Học phí đã chốt không đổi khi bảng giá khóa học thay đổi. {customerView ? "Bạn sẽ chuyển sang VNPay Sandbox để thanh toán thử nghiệm." : "Tiền mặt/chuyển khoản chỉ tạo giao dịch chờ."}</p>
    {confirmReceived && <p role="status">Chỉ xác nhận sau khi thực tế đã nhận đủ học phí. Máy chủ kiểm tra số tiền và lưu nhân viên xử lý.</p>}
    {message && <p role="status">{message}</p>}
    <ErrorMessage error={mutation.error} />
    {registration.status === "PENDING_PAYMENT" && !existing && <>{typeof coursePrice !== "number" && <p>Chưa có học phí từ hệ thống. Vui lòng liên hệ trung tâm trước khi tạo giao dịch.</p>}<SelectField label="Phương thức thanh toán" value={paymentMethod} onChange={setMethod}>{(customerView ? ["ONLINE"] : confirmReceived ? ["CASH", "BANK_TRANSFER"] : ["ONLINE", "CASH", "BANK_TRANSFER"]).map(v => <option key={v} value={v}>{v === "ONLINE" ? "VNPay Sandbox" : uiLabel(v)}</option>)}</SelectField><Button disabled={mutation.pending || !(coursePrice > 0)} onClick={create}>{mutation.pending ? "Đang tạo..." : customerView ? "Thanh toán qua VNPay Sandbox" : "Tạo giao dịch thanh toán"}</Button></>}
    {existing && (existing.paymentProvider === "PAYOS" || existing.payosOrderCode != null) && <p role="status">Giao dịch PayOS này được tạo trên ứng dụng. Vui lòng hoàn tất hoặc xử lý giao dịch trên ứng dụng trước khi thanh toán qua VNPay trên Web.</p>}{existing && <p>Đã có giao dịch đang chờ. Sử dụng giao dịch hiện tại để tránh tạo trùng.</p>}
    <div className="stack-list">{payments.map(p => <div key={p.id}><span>{formatters.money(p.amount)} · {uiLabel(p.paymentMethod)}<small>{formatters.dateTime(p.paymentDate || p.createdAt)}</small></span><Badge tone={p.status === "SUCCESS" ? "green" : p.status === "FAILED" ? "rose" : "amber"}>{p.status}</Badge>{isMember && p.status === "PENDING" && p.paymentMethod === "ONLINE" && p.paymentProvider !== "PAYOS" && p.payosOrderCode == null && registration.status === "PENDING_PAYMENT" && <Button disabled={mutation.pending} onClick={() => checkout(p.id)}>Thanh toán qua VNPay Sandbox</Button>}{confirmReceived && !isMember && p.status === "PENDING" && ["CASH", "BANK_TRANSFER"].includes(p.paymentMethod) && registration.status === "PENDING_PAYMENT" && <Button disabled={mutation.pending} onClick={() => { if (window.confirm("Xác nhận thực tế đã nhận đủ " + formatters.money(p.amount) + " cho đăng ký này?")) run(async () => { await paymentApi.recordOffline(p.id); setMessage("Máy chủ đã xác nhận thanh toán và đăng ký lớp."); reload(); }); }}>Xác nhận đã nhận đủ tiền</Button>}</div>)}</div>
    <p>VNPay hiện dùng môi trường sandbox. Kết quả thanh toán được máy chủ xác minh trước khi xác nhận đăng ký.</p>
    <Button variant="secondary" disabled={mutation.pending} onClick={reload}>Làm mới trạng thái</Button>
  </>;
}
