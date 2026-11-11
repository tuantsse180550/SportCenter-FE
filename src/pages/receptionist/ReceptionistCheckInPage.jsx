import { useState } from "react";
import { Badge, Button, Card, Field, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { attendanceService, scheduleService } from "../../services/index.js";
import { scheduleApi } from "../../services/api/resources.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { useAttendanceWindow } from "../../store/useAttendanceWindow.js";
import { formatters } from "../../utils/formatters.js";
function SessionCheckIn({ session, reload }) {
  const window = useAttendanceWindow(session); const [search, setSearch] = useState(""); const mutation = useMutation();
  return <Card><h2>{session.classItem?.name}</h2><p role="status">{window.message}</p><Field label="Tìm tên hoặc số điện thoại học viên" value={search} onChange={setSearch} /><ErrorMessage error={mutation.error} /><div className="stack-list">{session.members.filter(member => [member.name, member.phone].join(" ").toLowerCase().includes(search.toLowerCase())).map(member => <div key={member.id}><span>{member.name} · {member.phone}</span><Badge>{session.attendance.find(row => row.memberId === member.id)?.status || "Chưa điểm danh"}</Badge><Button disabled={mutation.pending || !window.allowed || session.attendanceAmbiguous} onClick={() => mutation.run(() => attendanceService.saveAttendance(session, { [member.id]: "PRESENT" }), reload)}>Ghi nhận có mặt</Button></div>)}</div>{session.attendanceAmbiguous && <p role="alert">Có nhiều buổi dùng chung lớp, bài học và ngày. Cần quản lý điều chỉnh lịch trước khi điểm danh.</p>}<p>Chỉ học viên đã xác nhận đăng ký được đưa vào danh sách.</p></Card>;
}
export function ReceptionistCheckInPage() {
  const [scheduleId, setScheduleId] = useState(""); const schedules = useQuery(() => scheduleApi.list()); const session = useQuery(() => scheduleId ? scheduleService.getSessionDetail(scheduleId) : null, [scheduleId]);
  return <><PageHeader title="Điểm danh tại quầy" subtitle="Chọn buổi học, tìm học viên và ghi nhận khi học viên đến." /><AsyncPanel query={schedules}>{rows => <SelectField label="Buổi học cần điểm danh" value={scheduleId} onChange={setScheduleId}><option value="">Chọn buổi học</option>{rows.filter(row => row.status !== "CANCELLED").map(row => <option key={row.id} value={row.id}>{formatters.date(row.date)} · {row.startTime} · {row.classItem?.name}</option>)}</SelectField>}</AsyncPanel><AsyncPanel query={session}>{data => data && <SessionCheckIn key={data.id} session={data} reload={session.reload} />}</AsyncPanel></>;
}
