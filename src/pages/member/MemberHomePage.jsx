import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { ResultCard, SessionCard, SportImage, StatusBadge } from "../../components/member/MemberUI.jsx";
import { memberService, scheduleService, trainingResultService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

function UpcomingSession({ memberId }) {
  const navigate = useNavigate();
  const query = useQuery(() => scheduleService.getMemberSchedule(memberId), [memberId]);
  return <section className="member-section">
    <div className="member-section-heading"><h2>Buổi học sắp tới</h2></div>
    <AsyncPanel query={query}>{sessions => {
      const upcoming = sessions.filter(s => s.status === "SCHEDULED" &&
        new Date(s.date + "T" + s.endTime + ":00+07:00").getTime() >= Date.now())
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];
      return <Card>{upcoming ? <><p className="member-date">{formatters.date(upcoming.date)}</p><SessionCard session={upcoming} onOpen={() => navigate("/member/classes/" + upcoming.classId)} /></> :
        <EmptyState title="Chưa có buổi học sắp tới được xác nhận" text="Lịch học sẽ xuất hiện khi đăng ký được xác nhận và lớp có lịch học." />}</Card>;
    }}</AsyncPanel>
  </section>;
}

function RecentResults({ memberId }) {
  const navigate = useNavigate();
  const query = useQuery(() => trainingResultService.listForMember(memberId), [memberId]);
  return <section className="member-section">
    <div className="member-section-heading"><h2>Kết quả gần đây</h2><Button variant="ghost" onClick={() => navigate("/member/results")}>Xem tất cả kết quả</Button></div>
    <AsyncPanel query={query}>{results => {
      const latest = [...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return latest ? <ResultCard result={latest} /> : <Card><EmptyState title="Chưa có kết quả tập luyện" text="Kết quả và nhận xét sẽ được huấn luyện viên ghi nhận sau quá trình tập luyện." /></Card>;
    }}</AsyncPanel>
  </section>;
}

function ConfirmedRegisteredClasses({ memberId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery(() => scheduleService.getMemberSchedule(memberId), [memberId]);
  useEffect(() => {
    if (!query.loading && !query.error && location.hash === "#registrations") document.getElementById("registrations")?.scrollIntoView({ block: "start" });
  }, [query.loading, query.error, location.hash]);
  return <AsyncPanel query={query}>{sessions => {
    // /schedules/my is scoped by BE to this JWT's CONFIRMED registrations.
    // Keep past/completed sessions too; a class is not just an upcoming lesson.
    const classes = [...new Map(sessions.filter(session => session.classId && session.registrationStatus === "CONFIRMED")
      .map(session => [session.classId, { ...session.classItem, id: session.classId, registrationStatus: session.registrationStatus }])).values()];
    return classes.length ? <>
      <p className="member-muted" role="status">{classes.length} lớp đã xác nhận có lịch học</p>
      <div className="member-registration-list">{classes.map(item => <Card key={item.id} className="member-registration">
        <div>{item.sport && <span className="member-eyebrow">{item.sport}</span>}<h3>{item.name || "Chưa có thông tin tên lớp"}</h3>{item.coach?.name && <p>Huấn luyện viên: {item.coach.name}</p>}</div>
        <div className="member-registration-state"><span>Đăng ký</span><StatusBadge status={item.registrationStatus} /><Button variant="secondary" onClick={() => navigate("/member/classes/" + item.id)}>Xem chi tiết lớp</Button></div>
      </Card>)}</div>
    </> : <Card><EmptyState title="Chưa có lớp đã xác nhận trong dữ liệu lịch học" text="Nếu bạn đã đăng ký hoặc thanh toán, lớp có thể chưa được xác nhận hoặc chưa có lịch học. Vui lòng liên hệ trung tâm để kiểm tra." /></Card>;
  }}</AsyncPanel>;
}

export function MemberHomePage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const location = useLocation();
  const profile = useQuery(() => memberService.getMyProfile(), [user.id]);
  useEffect(() => {
    if (location.hash === "#registrations") document.getElementById("registrations")?.scrollIntoView({ block: "start" });
  }, [location.hash, profile.loading]);
  return <>
    <section className="member-hero">
      <div><span className="member-eyebrow">Một ngày năng động bắt đầu từ bạn</span>
        <h1>Hôm nay của {profile.data?.name || user.name || "bạn"}</h1>
        <p>{profile.data?.goal || "Tìm lớp học phù hợp, theo dõi lịch học và cùng huấn luyện viên tiến bộ mỗi ngày."}</p>
        <div className="member-card-actions"><Button onClick={() => navigate("/member/classes")}>Khám phá lớp học</Button><Button variant="secondary" onClick={() => navigate("/member/schedule")}>Xem lịch học</Button></div>
      </div><SportImage className="member-hero-photo" />
    </section>
    <AsyncPanel query={profile}>{member => member ?
      <UpcomingSession memberId={member.id} /> :
      <Card className="member-section"><PageHeader title="Hoàn thiện hồ sơ để bắt đầu" subtitle="Thêm họ tên, số điện thoại và mục tiêu tập luyện để đăng ký lớp học." /><Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button></Card>
    }</AsyncPanel>
    <section id="registrations" className="member-section">
      <div className="member-section-heading"><h2>Lớp đã đăng ký</h2></div>
      <p className="member-muted">Mục này hiển thị các lớp đã xác nhận có lịch học. Danh sách chưa bao gồm lớp chưa xếp lịch hoặc đăng ký chờ thanh toán; thông tin giao dịch thanh toán chưa tra cứu được tại đây.</p>
      {profile.loading ? <Card><p role="status">Đang tải hồ sơ để xem lớp đã đăng ký...</p></Card> :
        profile.error ? <Card><p>Chưa thể tải lớp đã đăng ký do chưa đọc được hồ sơ. Vui lòng thử lại mục hồ sơ ở trên.</p></Card> :
        profile.data ? <ConfirmedRegisteredClasses memberId={profile.data.id} /> :
        <Card><p>Vui lòng hoàn thiện hồ sơ thành viên để xem lớp đã đăng ký.</p><Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button></Card>}
    </section>
    {!profile.loading && !profile.error && profile.data && <RecentResults memberId={profile.data.id} />}
  </>;
}
