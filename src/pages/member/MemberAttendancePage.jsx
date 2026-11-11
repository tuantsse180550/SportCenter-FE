import { useNavigate } from "react-router-dom";
import { Card, EmptyState, PageHeader, Badge, Button } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { attendanceService } from "../../services/api/attendanceApi.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

export function MemberAttendancePage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const query = useQuery(() => user?.memberId ? attendanceService.getMyAttendance() : Promise.resolve(null), [user?.memberId]);
  return <>
    <PageHeader title="Lịch sử điểm danh" subtitle="Kết quả điểm danh do trung tâm ghi nhận cho bạn." action={user?.memberId ? <Button onClick={query.reload}>Làm mới</Button> : null} />
    {!user?.memberId ? <Card><EmptyState title="Hoàn thiện hồ sơ để xem điểm danh" text="Vui lòng cập nhật họ tên, số điện thoại và mục tiêu tập luyện trước khi theo dõi điểm danh." action={<Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button>} /></Card> :
      <AsyncPanel query={query}>{rows => rows.length ? <div className="member-attendance-history">{rows.map(row => <Card key={row.id} className="member-attendance-entry">
        <div className="member-attendance-date"><small>Ngày học</small><time>{formatters.date(row.date)}</time></div>
        <div className="member-attendance-info"><h2>{row.classItem?.name || "Chưa có thông tin lớp"}</h2><p>{row.lesson?.title || "Chưa có thông tin bài học"}</p></div>
        <Badge tone={row.status === "PRESENT" ? "green" : "red"}>{row.status === "PRESENT" ? "Có mặt" : row.status === "ABSENT" ? "Vắng mặt" : "Chưa có thông tin"}</Badge>
      </Card>)}</div> : <Card><EmptyState title="Chưa có lịch sử điểm danh" text="Kết quả sẽ hiển thị sau khi huấn luyện viên ghi nhận điểm danh." /></Card>}</AsyncPanel>}
  </>;
}
