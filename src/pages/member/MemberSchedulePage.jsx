import { useNavigate } from "react-router-dom";
import { Card, EmptyState, PageHeader, Button } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { SessionCard } from "../../components/member/MemberUI.jsx";
import { scheduleService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

export function MemberSchedulePage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const query = useQuery(() => user.memberId ? scheduleService.getMemberSchedule(user.memberId) : Promise.resolve(null), [user.memberId]);
  return <>
    <PageHeader title="Lịch học của tôi" subtitle="Các buổi học thuộc đăng ký đã được trung tâm xác nhận." />
    <p className="member-notice">Đăng ký chờ thanh toán chưa thể tra cứu tại đây. Vui lòng liên hệ trung tâm để kiểm tra tình trạng đăng ký.</p>
    {!user.memberId ? <Card><EmptyState title="Hoàn thiện hồ sơ để xem lịch học" action={<Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button>} /></Card> :
      <AsyncPanel query={query}>{sessions => {
        const grouped = Object.groupBy(sessions, s => s.date);
        return <section className="member-section"><h2>Lịch học đã xác nhận</h2>
          {sessions.length ? Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) =>
            <section className="member-day" key={date}><h3>{formatters.date(date)}</h3><Card>{rows.map(s => <SessionCard key={s.id} session={s} onOpen={() => navigate("/member/classes/" + s.classId)} />)}</Card></section>) :
            <Card><EmptyState title="Chưa có buổi học được xác nhận" text="Nếu bạn đã đăng ký hoặc thanh toán, hãy liên hệ trung tâm để kiểm tra." /></Card>}
        </section>;
      }}</AsyncPanel>}
  </>;
}
