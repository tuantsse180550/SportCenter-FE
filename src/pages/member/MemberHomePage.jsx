import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { RegistrationHistory, ResultCard, SessionCard, SportImage } from "../../components/member/MemberUI.jsx";
import { classService, memberService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";
export function MemberHomePage() {
 const navigate = useNavigate(); const { user } = useApp(); const location = useLocation();
 const query = useQuery(async () => { const [member, classes] = await Promise.all([memberService.getMemberDetail(user.memberId), classService.listClasses()]); return { member, classes }; }, [user.memberId]);
 useEffect(() => { if (!query.loading && !query.error && location.hash === "#registrations") document.getElementById("registrations")?.scrollIntoView({ block: "start" }); }, [query.loading, query.error, location.hash]);
 return <AsyncPanel query={query}>{({ member, classes }) => {
 const upcoming = member?.schedule.filter(s => s.status === "SCHEDULED" && s.registrationStatus === "CONFIRMED" && new Date(s.date + "T" + s.endTime + ":00+07:00").getTime() >= Date.now()).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];
 return <><section className="member-hero"><div><span className="member-eyebrow">Một ngày năng động bắt đầu từ bạn</span><h1>Hôm nay của {member?.name || "bạn"}</h1><p>{member?.goal || "Tìm lớp học phù hợp, theo dõi lịch học và cùng huấn luyện viên tiến bộ mỗi ngày."}</p><div className="member-card-actions"><Button onClick={() => navigate("/member/classes")}>Khám phá lớp học</Button><Button variant="secondary" onClick={() => navigate("/member/schedule")}>Xem lịch học</Button></div></div><SportImage className="member-hero-photo" /></section>{!member ? <Card className="member-section"><PageHeader title="Hoàn thiện hồ sơ để bắt đầu" subtitle="Thêm họ tên, số điện thoại và mục tiêu tập luyện để đăng ký lớp học." /><Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button></Card> : <><section className="member-section"><div className="member-section-heading"><h2>Buổi học sắp tới</h2></div><Card>{upcoming ? <><p className="member-date">{formatters.date(upcoming.date)}</p><SessionCard session={upcoming} onOpen={() => navigate("/member/classes/" + upcoming.classId)} /></> : <EmptyState title="Chưa có buổi học sắp tới được xác nhận" text="Lịch học sẽ xuất hiện khi đăng ký được xác nhận và lớp có lịch học." />}</Card></section><RegistrationHistory registrations={member.registrations} payments={member.payments} classes={classes} /><section className="member-section"><div className="member-section-heading"><h2>Kết quả gần đây</h2>{member.results.length > 1 && <Button variant="ghost" onClick={() => navigate("/member/results")}>Xem tất cả kết quả</Button>}</div>{member.results[0] ? <ResultCard result={member.results[0]} /> : <Card><EmptyState title="Chưa có kết quả tập luyện" text="Kết quả và nhận xét sẽ được huấn luyện viên ghi nhận sau quá trình tập luyện." /></Card>}</section></>}</>;
 }}</AsyncPanel>;
}
