import { useNavigate } from "react-router-dom";
import { Card, EmptyState, PageHeader, Button } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { SessionCard } from "../../components/member/MemberUI.jsx";
import { scheduleService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";
function SessionGroups({ sessions, preview, navigate }) {
 const grouped = Object.groupBy(sessions, s => s.date);
 return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => <section className="member-day" key={date}><h3>{formatters.date(date)}</h3><Card>{rows.map(s => <SessionCard key={s.id} session={s} preview={preview} onOpen={() => navigate("/member/classes/" + s.classId)} />)}</Card></section>);
}
export function MemberSchedulePage() {
 const { user } = useApp(); const navigate = useNavigate(); const query = useQuery(() => user.memberId ? scheduleService.getMemberSchedule(user.memberId) : Promise.resolve([]), [user.memberId]);
 return <><PageHeader title="Lịch học của tôi" subtitle="Theo dõi ngày học, thời gian và buổi tập cùng huấn luyện viên." /><AsyncPanel query={query}>{sessions => {
 const confirmed = sessions.filter(s => s.registrationStatus === "CONFIRMED"); const pending = sessions.filter(s => s.registrationStatus === "PENDING_PAYMENT");
 return <>{!user.memberId && <Card><EmptyState title="Hoàn thiện hồ sơ để xem lịch học" action={<Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button>} /></Card>}<section className="member-section"><h2>Lịch học đã xác nhận</h2>{confirmed.length ? <SessionGroups sessions={confirmed} navigate={navigate} /> : <Card><EmptyState title="Chưa có buổi học được xác nhận" text="Bạn có thể xem trạng thái đăng ký trong mục Lớp đã đăng ký." /></Card>}</section>{pending.length > 0 && <section className="member-section"><h2>Lịch dự kiến • Chờ thanh toán</h2><p className="member-muted">Thông tin để tham khảo. Bạn chưa được xác nhận tham gia các buổi học này.</p><SessionGroups sessions={pending} preview navigate={navigate} /></section>}</>;
 }}</AsyncPanel></>;
}
