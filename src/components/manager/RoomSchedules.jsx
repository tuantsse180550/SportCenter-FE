import { Badge, Card, EmptyState } from "../common/UI.jsx";
import { AsyncPanel } from "../common/AsyncPanel.jsx";
import { scheduleApi } from "../../services/api/resources.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

export function RoomScheduleList({ roomId, sessions }) {
  const rows = sessions.filter(session => session.roomId === roomId).sort((a, b) =>
    [a.date || "", a.startTime || "", a.id].join("|").localeCompare([b.date || "", b.startTime || "", b.id].join("|")));
  return <Card className="table-card">
    <p role="status">{rows.length} buổi học được phân công tại phòng</p>
    {rows.length ? <table>
      <thead><tr><th>Ngày học</th><th>Thời gian</th><th>Lớp học</th><th>Bài học</th><th>Huấn luyện viên</th><th>Trạng thái</th></tr></thead>
      <tbody>{rows.map(session => <tr key={session.id}>
        <td>{formatters.date(session.date)}</td><td>{session.startTime}–{session.endTime}</td>
        <td>{session.classItem?.name || "Chưa có thông tin lớp"}</td>
        <td>{session.lesson?.title || "Chưa có thông tin bài học"}
          {session.lesson?.description && <details><summary>Nội dung bài học</summary><p style={{ whiteSpace: "pre-wrap" }}>{session.lesson.description}</p></details>}
        </td>
        <td>{session.coach?.name || "Chưa có thông tin HLV"}</td>
        <td><Badge>{session.status}</Badge></td>
      </tr>)}</tbody>
    </table> : <EmptyState title="Phòng chưa có lịch học" text="Chọn phòng này khi thêm hoặc import lịch học để phân công buổi học." />}
  </Card>;
}

export function RoomSchedules({ roomId }) {
  const query = useQuery(() => scheduleApi.list(), [roomId]);
  return <section aria-label="Lịch học của phòng" style={{ marginTop: 24 }}>
    <h2>Lịch học của phòng</h2>
    <AsyncPanel query={query}>{sessions => <RoomScheduleList roomId={roomId} sessions={sessions} />}</AsyncPanel>
  </section>;
}
