import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, EmptyState, InfoGrid, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { RegistrationBadge } from "../../components/common/RegistrationBadge.jsx";
import { PaymentHistory } from "../../components/common/PaymentHistory.jsx";
import { formatters, memberService } from "../../services/index.js";
import { classService } from "../../services/api/classApi.js";
import { registrationApi } from "../../services/api/resources.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
function MemberDetails({ member, reload }) {
  const navigate = useNavigate(); const [classId, setClassId] = useState(""); const mutation = useMutation();
  const classes = useQuery(() => classService.listMemberClasses());
  const cancel = registration => {
    if (window.confirm("Hủy đăng ký chờ thanh toán này?")) mutation.run(() => registrationApi.update(registration.id, { status: "CANCELLED" }), reload);
  };
  return <><PageHeader title={member.name} subtitle={member.phone + " | " + member.id} action={<Button onClick={() => navigate("/receptionist/payments?memberId=" + member.id)}>Thanh toán lớp học</Button>} />
    <Card><InfoGrid items={[["Họ tên", member.fullName], ["Số điện thoại", member.phone], ["Email", member.account?.email], ["Trạng thái", member.account?.status], ["Mục tiêu", member.goal], ["Trình độ", member.level]]} /></Card>
    <Card className="mt"><h2>Hỗ trợ đăng ký lớp</h2><AsyncPanel query={classes}>{rows => <><SelectField label="Chọn lớp học" value={classId} onChange={setClassId}><option value="">Chọn lớp và học phí</option>{rows.map(row => <option key={row.id} value={row.id}>{row.name} · {row.course?.name} · {formatters.money(row.course?.price)}</option>)}</SelectField><Button disabled={mutation.pending || !classId} onClick={() => mutation.run(() => registrationApi.create({ memberId: member.id, classId }), () => { setClassId(""); reload(); })}>Đăng ký lớp cho thành viên</Button></>}</AsyncPanel><ErrorMessage error={mutation.error} /></Card>
    <Card className="mt"><h2>Đăng ký lớp học</h2>{member.registrations.length ? <div className="stack-list">{member.registrations.map(row => <div key={row.id}><span>{row.classItem?.name} · {formatters.money(row.priceSnapshot)}</span><RegistrationBadge status={row.status} />{row.status === "PENDING_PAYMENT" && <Button variant="secondary" disabled={mutation.pending} onClick={() => cancel(row)}>Hủy đăng ký</Button>}</div>)}</div> : <EmptyState title="Chưa đăng ký lớp học" />}</Card><PaymentHistory payments={member.payments} /></>;
}
export function ReceptionistMemberDetailPage() {
  const { memberId } = useParams(); const query = useQuery(() => memberService.getMemberDetail(memberId), [memberId]);
  return <AsyncPanel query={query}>{member => member ? <MemberDetails member={member} reload={query.reload} /> : <EmptyState title="Không tìm thấy thành viên" />}</AsyncPanel>;
}
