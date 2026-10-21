import { uiLabel } from "../../utils/vietnamese.js";
import { RegistrationBadge } from "./RegistrationBadge.jsx";
import { AvatarText, Badge, Button, Card, EmptyState, Icon } from "./UI.jsx";
export function MemberTable({ members, onOpen }) {
  return <Card className="table-card">{members.length ? <table><thead><tr><th>Thành viên</th><th>Số điện thoại</th><th>Mục tiêu</th><th>Trình độ</th><th>Lớp học</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} onClick={() => onOpen(member)}><td><button type="button" className="table-entry-button" onClick={event => { event.stopPropagation(); onOpen(member); }}><AvatarText name={member.name} sub={member.id} /></button></td><td>{member.phone}</td><td>{member.goal}</td><td>{uiLabel(member.level)}</td><td>{member.registeredClasses?.length ?? "Chưa có"}</td></tr>)}</tbody></table> : <EmptyState title="Không tìm thấy thành viên" />}</Card>;
}
export function SessionTimeline({ sessions, onOpen }) {
  if (!sessions.length) return <EmptyState title="Chưa có buổi học" />;
  return <div className="timeline">{sessions.map((session) => <button type="button" key={session.id} onClick={() => onOpen(session.id)}>
    <time>{session.startTime}<small>{session.endTime}</small></time>
    <i aria-hidden="true" />
    <span className="timeline-content">
      <strong>{session.classItem?.name}</strong>
      {session.lesson?.title && <small className="timeline-lesson">{session.lesson.title}</small>}
      <span className="timeline-meta"><small>Ngày: {session.date}</small>{session.coach?.name && <small>HLV: {session.coach.name}</small>}<small>{session.memberCount} thành viên đã xác nhận</small></span>
      {session.room && <small>Phòng: {session.room.roomNumber} · {session.room.name}</small>}
      {session.registrationStatus && <small>Đăng ký: <RegistrationBadge status={session.registrationStatus} /></small>}
    </span>
    <Badge tone={session.status === "COMPLETED" ? "green" : "blue"}>{session.status}</Badge>
  </button>)}</div>;
}
export function ClassCardGrid({ classes, onOpen, onRegister, pending = false }) {
  if (!classes.length) return <EmptyState title="Không tìm thấy lớp học" />;
  return <div className="class-grid">{classes.map((item) => <Card key={item.id} className="class-card blue"><div className="class-card-top"><span><Icon name="activity" /></span><Badge>{item.enrolledCount} đã xác nhận</Badge></div><h2>{item.name}</h2><p>{item.sport} | Huấn luyện viên {item.coach?.name}</p><small>{uiLabel(item.schedule)}</small><div className="class-actions"><Button variant="secondary" onClick={() => onOpen(item.id)}>Xem chi tiết</Button>{onRegister && <Button disabled={pending} onClick={() => onRegister(item)}>Đăng ký</Button>}</div></Card>)}</div>;
}
