import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { Button, InfoGrid, Modal, SelectField, Badge } from "./UI.jsx";
import { AsyncPanel, ErrorMessage } from "./AsyncPanel.jsx";
import { RegistrationBadge } from "./RegistrationBadge.jsx";
import { paymentService, formatters } from "../../services/index.js";
import { authService } from "../../services/api/authApi.js";
import { useMutation, useQuery } from "../../store/useQuery.js";

export function RegistrationPaymentModal({ registrationId, confirmReceived = false, customerView = false, onClose }) {
  const [busy, setBusy] = useState(false);
  const query = useQuery(() => paymentService.getRegistrationPayment(registrationId), [registrationId]);
  return <Modal title="Thanh toán đăng ký lớp học" onClose={busy ? () => {} : onClose}><AsyncPanel query={query}>{data => data.registration ? <PaymentForm data={data} confirmReceived={confirmReceived} customerView={customerView} reload={query.reload} setBusy={setBusy} /> : <p>Không tìm thấy đăng ký.</p>}</AsyncPanel></Modal>;
}
function PaymentForm({ data, confirmReceived, customerView, reload, setBusy }) {
  const { registration, payments, coursePrice } = data;
  const existing = payments.find(p => p.status === "PENDING");
  const [paymentMethod, setMethod] = useState("ONLINE");
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
  });
  const checkout = id => run(async () => {
    const { paymentUrl } = await paymentService.createVnpayUrl(id);
    window.location.assign(paymentUrl);
  });
  return <><InfoGrid items={[["Lớp học", registration.classItem?.name], ...(!customerView ? [["Thành viên", registration.member?.name]] : []), ["Học phí khóa học", typeof coursePrice === "number" ? formatters.money(coursePrice) : "Chưa có giá từ hệ thống"]]} />
    <p>Đăng ký: <RegistrationBadge status={registration.status} /></p>
    <p>Số tiền giao dịch được hệ thống tính từ học phí khóa học. Tiền mặt/chuyển khoản chỉ tạo giao dịch chờ; hiện chưa có thao tác xác nhận tại quầy.</p>
    {confirmReceived && <p role="status">Chưa hỗ trợ xác nhận đã nhận tiền. Bạn có thể tra cứu trạng thái và lịch sử bên dưới.</p>}
    {message && <p role="status">{message}</p>}
    <ErrorMessage error={mutation.error} />
    {registration.status === "PENDING_PAYMENT" && !confirmReceived && !existing && <>{typeof coursePrice !== "number" && <p>Chưa có học phí từ hệ thống. Vui lòng liên hệ trung tâm trước khi tạo giao dịch.</p>}<SelectField label="Phương thức thanh toán" value={paymentMethod} onChange={setMethod}>{["ONLINE", "CASH", "BANK_TRANSFER"].map(v => <option key={v} value={v}>{uiLabel(v)}</option>)}</SelectField><Button disabled={mutation.pending || !(coursePrice > 0)} onClick={create}>{mutation.pending ? "Đang tạo..." : "Tạo giao dịch thanh toán"}</Button></>}
    {existing && <p>Đã có giao dịch đang chờ. Sử dụng giao dịch hiện tại để tránh tạo trùng.</p>}
    <div className="stack-list">{payments.map(p => <div key={p.id}><span>{formatters.money(p.amount)} · {uiLabel(p.paymentMethod)}<small>{formatters.dateTime(p.paymentDate || p.createdAt)}</small></span><Badge tone={p.status === "SUCCESS" ? "green" : p.status === "FAILED" ? "rose" : "amber"}>{p.status}</Badge>{isMember && p.status === "PENDING" && p.paymentMethod === "ONLINE" && registration.status === "PENDING_PAYMENT" && <Button disabled={mutation.pending} onClick={() => checkout(p.id)}>Thanh toán qua VNPay Sandbox</Button>}</div>)}</div>
    <p>VNPay hiện dùng môi trường sandbox. Khi quay lại, hãy làm mới để lấy trạng thái do BE xác minh; thông tin trên URL không được dùng để tự xác nhận thanh toán.</p>
    <Button variant="secondary" disabled={mutation.pending} onClick={reload}>Làm mới trạng thái</Button>
  </>;
}
