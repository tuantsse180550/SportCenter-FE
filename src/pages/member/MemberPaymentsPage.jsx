import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { RegistrationPaymentModal } from "../../components/common/RegistrationPaymentModal.jsx";
import { StatusBadge } from "../../components/member/MemberUI.jsx";
import { paymentService, formatters } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
import { useApp } from "../../store/useApp.js";
import { uiLabel } from "../../utils/vietnamese.js";

export function MemberPaymentsPage() {
  const [paying, setPaying] = useState(null);
  const navigate = useNavigate();
  const { user } = useApp();
  const query = useQuery(async () => {
    if (!user?.memberId) return { registrations: [], payments: [] };
    const [registrations, payments] = await Promise.all([paymentService.listMyRegistrations(), paymentService.listPayments()]);
    return { registrations, payments };
  }, [user?.id, user?.memberId]);
  return <>
    <PageHeader title="Thanh toán của tôi" subtitle="Theo dõi đăng ký lớp, thanh toán học phí và xem biên nhận." />
    {!user?.memberId ? <Card><EmptyState title="Hoàn thiện hồ sơ để đăng ký và thanh toán" text="Vui lòng cập nhật họ tên, số điện thoại và mục tiêu tập luyện trước khi đăng ký lớp và thanh toán học phí." action={<Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button>} /></Card> :
      <AsyncPanel query={query}>{({ registrations, payments }) => <>
        <section className="member-section"><h2>Đăng ký chờ thanh toán</h2>
          {registrations.some(row => row.status === "PENDING_PAYMENT") ? <div className="stack-list">{registrations.filter(row => row.status === "PENDING_PAYMENT").map(row =>
            <Card key={row.id}><h3>{row.classItem?.name || "Đăng ký lớp học"}</h3><StatusBadge status={row.status} />{Number.isFinite(row.priceSnapshot) && <p>Học phí đã chốt: {formatters.money(row.priceSnapshot)}</p>}<p>Hoàn tất thanh toán để xác nhận đăng ký lớp.</p><Button onClick={() => setPaying(row.id)}>Thanh toán học phí</Button></Card>
          )}</div> : <Card><EmptyState title="Không có đăng ký chờ thanh toán" action={<Button onClick={() => navigate("/member/classes")}>Khám phá lớp học</Button>} /></Card>}
        </section>
        <section className="member-section"><h2>Lịch sử giao dịch</h2>
          {payments.length ? <div className="stack-list">{payments.map(payment => <Card key={payment.id}>
            <h3>{payment.classItem?.name || "Học phí lớp học"}</h3><p>{formatters.money(payment.amount)} · {uiLabel(payment.paymentMethod)} · {formatters.dateTime(payment.paymentDate || payment.createdAt)}</p><StatusBadge status={payment.status} />
            <p>Mã giao dịch: {payment.id}</p><Button variant="secondary" onClick={() => navigate("/payment-result?paymentId=" + payment.id)}>Xem kết quả và biên nhận</Button>
          </Card>)}</div> : <Card><EmptyState title="Chưa có giao dịch thanh toán" /></Card>}
        </section>
      </>}</AsyncPanel>}
    {paying && <RegistrationPaymentModal registrationId={paying} customerView onClose={() => { setPaying(null); query.reload(); }} />}
  </>;
}
