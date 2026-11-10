import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState } from "../common/UI.jsx";
import { uiLabel } from "../../utils/vietnamese.js";
import { formatters } from "../../utils/formatters.js";
import { classTuition } from "../../utils/classTuition.js";
const photos = {
 yoga: "/images/member/yoga.jpg",
 swimming: "/images/member/swimming.jpg",
 boxing: "/images/member/boxing.jpg",
 gym: "/images/member/gym.jpg",
};
export function SportImage({ sport = "", className = "" }) {
 const category = /yoga/i.test(sport) ? "yoga" : /swim|bơi/i.test(sport) ? "swimming" : /box|quyền anh/i.test(sport) ? "boxing" : "gym";
 return <div className={"member-photo " + className}><img src={photos[category]} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = "hidden"; }} /></div>;
}
export function StatusBadge({ status }) {
 const tone = ["CONFIRMED", "SUCCESS", "COMPLETED", "ACTIVE"].includes(status) ? "green" : ["PENDING_PAYMENT", "PENDING"].includes(status) ? "amber" : ["CANCELLED", "FAILED", "INACTIVE"].includes(status) ? "slate" : "blue";
 return <span className={"badge member-status " + tone}>{status === "SCHEDULED" ? "Đã lên lịch" : uiLabel(status)}</span>;
}
export function MemberRegistrationNotice() {
 return <p className="member-notice" role="status">Đăng ký lớp được xác nhận sau khi thanh toán thành công. Theo dõi giao dịch tại mục Thanh toán của tôi.</p>;
}
export function ClassCard({ item, registration, onRegister, pending, canRegister, registrationKnown = true }) {
 const navigate = useNavigate();
 const tuition = classTuition(item);
 return <article className="member-class-card"><SportImage sport={item.sport} /><div className="member-class-body">
   <span className="member-eyebrow">{item.sport || "Lớp thể thao"}</span><h2>{item.name}</h2>
   {item.course?.name && <p>Khóa học: {item.course.name}</p>}
   <p>Học phí trọn khóa / học viên: {Number.isFinite(tuition) ? formatters.money(tuition) : "Chưa thiết lập"}</p>
   <p>Huấn luyện viên: {item.coach?.name || "Chưa có thông tin"}</p>
   <p className="member-class-schedule">{typeof item.schedule === "string" ? uiLabel(item.schedule).replace(/\b\d{4}-\d{2}-\d{2}\b/g, date => formatters.date(date)) : registrationKnown ? "Chưa có lịch học" : "Xem lịch học trong chi tiết lớp"}</p>
   {Number.isFinite(item.enrolledCount) && <p className="member-muted">{item.enrolledCount} thành viên đã xác nhận</p>}{registration && <StatusBadge status={registration.status} />}
   <div className="member-card-actions"><Button variant="secondary" onClick={() => navigate("/member/classes/" + item.id)}>Xem chi tiết</Button>{registrationKnown && !registration && <Button disabled={pending || !canRegister} onClick={() => onRegister(item)}>Đăng ký</Button>}</div>
 </div></article>;
}
export function SessionCard({ session, preview = false, onOpen }) {
 return <article className={"member-session " + (preview ? "is-preview" : "")}><div className="member-session-time"><strong>{session.startTime}</strong><span>{session.endTime}</span></div><div><h3>{session.classItem?.name || "Buổi học"}</h3><p>Huấn luyện viên: {session.coach?.name || "Chưa có thông tin"}</p>{session.lesson?.title && <p>{session.lesson.title}</p>}<p>Phòng: {session.room ? session.room.roomNumber + " · " + session.room.name : "Chưa có thông tin"}</p>{preview && <small>Đăng ký chờ thanh toán • Chưa xác nhận chỗ học</small>}</div><div className="member-session-actions"><div><small>Trạng thái buổi học</small><StatusBadge status={session.status} /></div><Button variant="ghost" onClick={onOpen}>Xem chi tiết</Button></div></article>;
}
export function RegistrationHistory({ registrations, payments, classes = [] }) {
 const [status, setStatus] = useState(""); const navigate = useNavigate();
 const rows = registrations.filter(r => !status || r.status === status);
 return <section id="registrations" className="member-section"><div className="member-section-heading"><div><span className="member-eyebrow">Hành trình của bạn</span><h2>Lớp đã đăng ký</h2></div><span>{registrations.length} đăng ký</span></div><div className="member-tabs" role="group" aria-label="Lọc đăng ký">{[["", "Tất cả"], ["PENDING_PAYMENT", "Chờ thanh toán"], ["CONFIRMED", "Đã xác nhận"], ["CANCELLED", "Đã hủy"]].map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div>{rows.length ? <div className="member-registration-list">{rows.map(r => { const cls = classes.find(c => c.id === r.classId) || r.classItem; const paid = payments.filter(p => p.classRegistrationId === r.id); return <Card key={r.id} className="member-registration"><div><span className="member-eyebrow">{cls?.sport || "Đăng ký lớp học"}</span><h3>{cls?.name || "Lớp học"}</h3>{cls?.coach?.name && <p>Huấn luyện viên: {cls.coach.name}</p>}{r.registeredAt && <p className="member-muted">Ngày đăng ký: {formatters.date(r.registeredAt)}</p>}</div><div className="member-registration-state"><span>Đăng ký</span><StatusBadge status={r.status} />{paid.map(p => <div className="member-payment-line" key={p.id}><small>Thanh toán: {formatters.money(p.amount)}</small><StatusBadge status={p.status} /></div>)}{!paid.length && <small>Chưa có giao dịch thanh toán</small>}<Button variant="secondary" onClick={() => navigate("/member/classes/" + r.classId)}>{r.status === "PENDING_PAYMENT" ? "Xem thông tin thanh toán" : "Xem chi tiết"}</Button></div></Card>; })}</div> : <Card><EmptyState title={registrations.length ? "Chưa có đăng ký ở trạng thái này" : "Bạn chưa đăng ký lớp học"} text="Khám phá lớp học phù hợp để bắt đầu hành trình vận động." /></Card>}</section>;
}
export function ResultCard({ result }) {
 return <Card className="member-result"><span className="member-eyebrow">{formatters.date(result.createdAt)}</span><h3>{result.workoutPlan?.goal || "Kết quả tập luyện"}</h3><p>{result.result}</p>{result.comment && <blockquote><strong>Nhận xét của huấn luyện viên</strong><p>{result.comment}</p></blockquote>}{result.coach?.name && <small>Huấn luyện viên: {result.coach.name}</small>}</Card>;
}
