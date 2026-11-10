import { useState } from "react";
import { attendanceService, reportService } from "../../services/index.js";
import { ConfirmDelete } from "./ConfirmDelete.jsx";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { AsyncPanel } from "./AsyncPanel.jsx";
import { Badge, Button, Card, EmptyState, Field, SelectField, SummaryGrid } from "./UI.jsx";
import { formatters } from "../../utils/formatters.js";
export function ManagerAttendanceReport() {
  const query = useQuery(() => reportService.getAttendanceReport());
  return <AsyncPanel query={query}>{data => <AttendanceRows {...data} />}</AsyncPanel>;
}
function AttendanceRows({ rows, classes }) {
  const [deleting, setDeleting] = useState(null);
  const { toast } = useApp();
  const [classId, setClass] = useState("");
  const [coachId, setCoach] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const coaches = [...new Map(classes.filter(c => c.coachId).map(c => [c.coachId, c.coach?.name || c.coachId])).entries()];
  const visible = rows.filter(r => (!classId || r.classId === classId) && (!coachId || classes.some(c => c.id === r.classId && c.coachId === coachId)) && (!from || r.date >= from) && (!to || r.date <= to));
  const present = visible.filter(r => r.status === "PRESENT").length;
  return <Card className="mt"><div className="card-title"><strong>Báo cáo điểm danh</strong></div><div className="form-grid">
    <SelectField label="Lớp học" value={classId} onChange={setClass}><option value="">Tất cả lớp</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
    <SelectField label="Huấn luyện viên hiện được phân công" value={coachId} onChange={setCoach}><option value="">Tất cả</option>{coaches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</SelectField>
    <Field label="Điểm danh từ ngày" type="date" value={from} onChange={setFrom} /><Field label="Điểm danh đến ngày" type="date" value={to} onChange={setTo} />
  </div><SummaryGrid items={[{ label: "Lượt có mặt đã ghi nhận", value: present }, { label: "Lượt vắng đã ghi nhận", value: visible.filter(r => r.status === "ABSENT").length }, { label: "Tỷ lệ có mặt trên bản ghi", value: visible.length ? Math.round(present / visible.length * 100) + "%" : "Chưa có dữ liệu" }]} />
    <p>Tỷ lệ chỉ tính trên bản ghi đã lưu, không coi buổi chưa điểm danh là vắng. Bộ lọc Coach theo phân công hiện tại, không phải lịch sử phân công.</p>
    {visible.length ? <div style={{ overflowX: "auto" }}><table><thead><tr><th>Ngày</th><th>Lớp</th><th>Thành viên</th><th>Kết quả</th><th>Thao tác</th></tr></thead><tbody>{visible.map(r => <tr key={r.id}><td>{formatters.date(r.date)}</td><td>{classes.find(c => c.id === r.classId)?.name || r.classId}</td><td>{r.member?.name || r.memberId}</td><td><Badge tone={r.status === "PRESENT" ? "green" : "rose"}>{r.status}</Badge></td><td><Button variant="danger" onClick={() => setDeleting(r)}>Xóa điểm danh</Button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có kết quả điểm danh phù hợp" />}
    {deleting && <ConfirmDelete title="Xóa điểm danh" name={(deleting.member?.name || deleting.memberId) + " · " + formatters.date(deleting.date)}
      onClose={() => setDeleting(null)} onDelete={() => attendanceService.deleteRecord(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa điểm danh"); }}>
      <p>Thành viên sẽ chưa có kết quả điểm danh cho buổi này. Báo cáo được tính lại sau khi xóa.</p>
    </ConfirmDelete>}
  </Card>;
}
