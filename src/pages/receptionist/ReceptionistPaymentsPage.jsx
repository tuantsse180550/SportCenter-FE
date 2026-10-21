import { PaymentHistory } from "../../components/common/PaymentHistory.jsx";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { RegistrationPaymentModal } from "../../components/common/RegistrationPaymentModal.jsx";
import { RegistrationBadge } from "../../components/common/RegistrationBadge.jsx";
import { paymentService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
export function ReceptionistPaymentsPage() { const [params] = useSearchParams(); const memberId = params.get("memberId"); const [paying, setPaying] = useState(null); const query = useQuery(async () => ({ payments: (await paymentService.listPayments()).filter((p) => !memberId || p.memberId === memberId), pending: (await paymentService.listPendingRegistrations()).filter((r) => !memberId || r.memberId === memberId) }), [memberId]); return <><PageHeader title="Thanh toán đăng ký lớp học" subtitle="Tra cứu giao dịch và đăng ký. Hiện chưa hỗ trợ xác nhận thanh toán tại quầy." /><AsyncPanel query={query}>{({ payments, pending }) => <><Card><div className="card-title"><strong>Đăng ký chờ thanh toán</strong></div>{pending.length ? <div className="stack-list">{pending.map((r) => <div key={r.id}><span>{r.member?.name} | {r.classItem?.name}</span><RegistrationBadge status={r.status} /><Button onClick={() => setPaying(r.id)}>Xem thanh toán</Button></div>)}</div> : <EmptyState title="Chưa có đăng ký chờ thanh toán" />}</Card><PaymentHistory payments={payments} /></>}</AsyncPanel>{paying && <RegistrationPaymentModal registrationId={paying} confirmReceived onClose={() => setPaying(null)} />}</>; }
