import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { ResultCard, SessionCard, SportImage, RegistrationHistory } from "../../components/member/MemberUI.jsx";
import { memberService, scheduleService, trainingResultService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { registrationApi, paymentApi } from "../../services/api/resources.js";
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
  const query = useQuery(async () => { const [registrations, payments] = await Promise.all([registrationApi.list(), paymentApi.list()]); return { registrations, payments }; }, [memberId]);
  return <AsyncPanel query={query}>{data => <RegistrationHistory sectionId={null} registrations={data.registrations} payments={data.payments} />}</AsyncPanel>;
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
      <p className="member-muted">Tất cả đăng ký của bạn, bao gồm lớp chưa xếp lịch và đăng ký chờ thanh toán.</p>
      {profile.loading ? <Card><p role="status">Đang tải hồ sơ để xem lớp đã đăng ký...</p></Card> :
        profile.error ? <Card><p>Chưa thể tải lớp đã đăng ký do chưa đọc được hồ sơ. Vui lòng thử lại mục hồ sơ ở trên.</p></Card> :
        profile.data ? <ConfirmedRegisteredClasses memberId={profile.data.id} /> :
        <Card><p>Vui lòng hoàn thiện hồ sơ thành viên để xem lớp đã đăng ký.</p><Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button></Card>}
    </section>
    {!profile.loading && !profile.error && profile.data && <RecentResults memberId={profile.data.id} />}
  </>;
}
