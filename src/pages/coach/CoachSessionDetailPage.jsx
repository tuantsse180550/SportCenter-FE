import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { AvatarText, Badge, Button, Card, EmptyState, PageHeader, SummaryGrid } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { ResultModal } from "../../components/coach/ResultModal.jsx";
import { attendanceService, scheduleService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";
import { useAttendanceWindow } from "../../store/useAttendanceWindow.js";
import "../../components/coach/attendance.css";
function SessionContent({ session, user, toast, reload }) {
  const timeWindow = useAttendanceWindow(session);
  const [attendance, setAttendance] = useState({});
  const [resultMember, setResultMember] = useState(null); const mutation = useMutation();
  const savedRecord = memberId => session.attendanceAmbiguous ? undefined : session.attendance.find(a => a.memberId === memberId);
  const selected = memberId => attendance[memberId] ?? savedRecord(memberId)?.status ?? "";
  const changes = Object.fromEntries(session.members.filter(m => selected(m.id) && selected(m.id) !== savedRecord(m.id)?.status).map(m => [m.id, selected(m.id)]));
  const save = () => mutation.run(async () => {
    try { return await attendanceService.saveAttendance(session, changes); }
    finally { reload(); }
  }, ({ saved }) => toast(saved + " lượt điểm danh đã được lưu"));
  const remove = record => {
    if (!window.confirm("Xóa kết quả điểm danh đã lưu? Sau khi xóa, thành viên sẽ chưa có kết quả điểm danh cho buổi này.")) return;
    mutation.run(async () => {
      try { return await attendanceService.deleteAttendance(session, record.memberId); }
      finally { reload(); }
    }, () => { setAttendance(old => { const next = { ...old }; delete next[record.memberId]; return next; }); toast("Đã xóa kết quả điểm danh"); });
  };
  return <><PageHeader title={session.classItem?.name} subtitle={formatters.date(session.date) + " | " + session.startTime + " – " + session.endTime + " | " + (session.lesson?.title || "Chưa có tên bài học")} action={<Button disabled variant="secondary">Chưa hỗ trợ đổi huấn luyện viên</Button>} />
    {session.room && <p>Phòng: {session.room.roomNumber} · {session.room.name}</p>}<SummaryGrid items={[{ label: "Thành viên đã xác nhận", value: session.members.length }, { label: "Có mặt đã lưu", value: session.attendanceAmbiguous ? "Chưa xác định" : session.attendance.filter(a => a.status === "PRESENT").length }, { label: "Vắng mặt đã lưu", value: session.attendanceAmbiguous ? "Chưa xác định" : session.attendance.filter(a => a.status === "ABSENT").length }]} />
    <p role="status" aria-live="polite">{timeWindow.message}</p><ErrorMessage error={mutation.error} />
    {session.attendanceAmbiguous && <Card><p role="alert">Nhiều buổi học dùng chung lớp, bài học và ngày điểm danh. Hiện chưa thể xác định kết quả thuộc buổi nào. Vui lòng liên hệ quản lý; thao tác điểm danh được tạm khóa.</p></Card>}
    <Card><div className="card-title"><strong>Điểm danh</strong><Button disabled={mutation.pending || !timeWindow.allowed || session.attendanceAmbiguous || !Object.keys(changes).length} onClick={save}>{mutation.pending ? "Đang lưu..." : "Lưu điểm danh"}</Button></div>
      <p>Chọn trạng thái cho thành viên cần ghi nhận hoặc cập nhật. Các dòng chưa chọn sẽ không được đánh dấu vắng mặt.</p>
      {session.members.length ? <div className="attendance-list">{session.members.map(m => <div key={m.id} className="coach-attendance-row"><AvatarText name={m.name} sub={m.phone} /><div className="attendance-control"><select aria-label={"Điểm danh " + m.name} disabled={mutation.pending || !timeWindow.allowed || session.attendanceAmbiguous} value={selected(m.id)} onChange={e => setAttendance({ ...attendance, [m.id]: e.target.value })}><option value="">Chọn trạng thái điểm danh</option><option value="PRESENT">{uiLabel("PRESENT")}</option><option value="ABSENT">{uiLabel("ABSENT")}</option></select><small>{session.attendanceAmbiguous ? "Kết quả chưa thể gắn với một buổi học duy nhất" : savedRecord(m.id) ? "Đã lưu: " + uiLabel(savedRecord(m.id).status) : "Chưa có kết quả điểm danh"}</small></div><Button variant="ghost" onClick={() => setResultMember(m)}>Ghi nhận kết quả</Button></div>)}</div> : <EmptyState title="Chưa có thành viên được xác nhận" text="Đăng ký chờ thanh toán chưa được đưa vào danh sách điểm danh." />}
    </Card>
    <Card className="mt"><div className="card-title"><strong>Kết quả điểm danh đã ghi nhận</strong><Button variant="secondary" disabled={mutation.pending} onClick={reload}>Làm mới điểm danh</Button></div>
      {session.attendanceAmbiguous ? <p>Chưa thể phân biệt bản ghi giữa các buổi học trùng thông tin.</p> : session.attendance.length ? <div style={{ overflowX: "auto" }}><table><thead><tr><th>Thành viên</th><th>Kết quả đã lưu</th><th>Cập nhật gần nhất</th><th>Thao tác</th></tr></thead><tbody>{session.attendance.map(record => <tr key={record.id}><td>{record.member?.name || session.members.find(m => m.id === record.memberId)?.name || "Chưa có thông tin thành viên"}</td><td><Badge tone={record.status === "PRESENT" ? "green" : "rose"}>{record.status}</Badge></td><td>{formatters.dateTime(record.updatedAt || record.createdAt)}</td><td><Button variant="ghost" disabled={mutation.pending || !timeWindow.allowed} onClick={() => remove(record)}>Xóa điểm danh</Button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có kết quả điểm danh" text="Chỉ các trạng thái đã lưu thành công mới xuất hiện tại đây." />}
    </Card>
    {resultMember && <ResultModal member={resultMember} plans={session.plans.filter(p => p.memberId === resultMember.id && p.coachId === user.coachId)} onClose={() => setResultMember(null)} onDone={() => { setResultMember(null); toast("Đã lưu kết quả tập luyện"); }} />}
  </>;
}
export function CoachSessionDetailPage() {
  const { sessionId } = useParams(); const { user, toast } = useApp(); const query = useQuery(() => scheduleService.getSessionDetail(sessionId), [sessionId]);
  return <AsyncPanel query={query}>{session => !session ? <EmptyState title="Không tìm thấy buổi học" /> : session.coachId !== user.coachId ? <EmptyState title="Bạn chưa được phân công buổi học này" /> : <SessionContent key={sessionId} session={session} user={user} toast={toast} reload={query.reload} />}</AsyncPanel>;
}
