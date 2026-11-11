import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { homeworkApi, lessonProgressApi, workoutPlanApi } from "../../services/api/resources.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";
import { uiLabel } from "../../utils/vietnamese.js";

function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function MemberTrainingSections({ plans = [], progress = [], homework = [] }) {
  const approvedPlans = plans.filter(row => row.status === "APPROVED");
  return <>
    <section className="member-section">
      <h2>Kế hoạch tập luyện</h2>
      {approvedPlans.length ? <div className="card-grid">{approvedPlans.map(row => <Card key={row.id}>
        <h3>{row.goal || "Kế hoạch tập luyện"}</h3>
        <p>{row.plan}</p>
        <small>{[row.coach?.name, row.classItem?.name || "Kế hoạch cá nhân", uiLabel(row.level)].filter(Boolean).join(" · ")}</small>
      </Card>)}</div> : <Card><EmptyState title="Chưa có kế hoạch được duyệt" /></Card>}
    </section>
    <section className="member-section">
      <h2>Tiến bộ và nhận xét</h2>
      {progress.length ? <div className="card-grid">{progress.map(row => {
        const timestamp = row.evaluatedAt || row.updatedAt;
        return <Card key={row.id}>
          <h3>{row.lessonId?.title || "Bài học"}</h3>
          <p>{[row.classId?.name, uiLabel(row.status)].filter(Boolean).join(" · ")}</p>
          <p>{row.coachComment || "Chưa có nhận xét từ huấn luyện viên"}</p>
          {timestamp && <small>{formatters.dateTime(timestamp)}</small>}
        </Card>;
      })}</div> : <Card><EmptyState title="Chưa có đánh giá tiến bộ" /></Card>}
    </section>
    <section className="member-section">
      <h2>Bài tập và thông báo lớp</h2>
      {homework.length ? <div className="card-grid">{homework.map(row => <Card key={row.id}>
        <h3>{row.title}</h3>
        <p>{row.description}</p>
        {Array.isArray(row.attachments) && row.attachments.length > 0 && <ul className="member-attachments">{row.attachments.filter(item => typeof item === "string" && item.trim()).map((item, idx) => {
          const href = safeHttpUrl(item);
          return <li key={idx}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{item.trim()}</a> : item.trim()}</li>;
        })}</ul>}
        <small>{[row.classId?.name, row.dueDate ? "Hạn: " + formatters.date(row.dueDate) : "Không đặt hạn hoàn thành", row.coachId?.fullName].filter(Boolean).join(" · ")}</small>
      </Card>)}</div> : <Card><EmptyState title="Chưa có bài tập được giao" /></Card>}
    </section>
  </>;
}

export function MemberTrainingPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const query = useQuery(async () => {
    if (!user?.memberId) return null;
    const [plans, progress, homework] = await Promise.all([workoutPlanApi.list(), lessonProgressApi.list(), homeworkApi.my()]);
    return { plans, progress, homework };
  }, [user?.memberId]);
  return <>
    <PageHeader title="Kế hoạch và phản hồi" subtitle="Hướng dẫn, bài tập và đánh giá của huấn luyện viên dành cho bạn." />
    {!user?.memberId ? <Card><EmptyState title="Hoàn thiện hồ sơ để xem kế hoạch và phản hồi" text="Hồ sơ thành viên giúp huấn luyện viên giao kế hoạch, bài tập và nhận xét cho bạn." action={<Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button>} /></Card> :
      <AsyncPanel query={query}>{data => <MemberTrainingSections plans={data.plans} progress={data.progress} homework={data.homework} />}</AsyncPanel>}
  </>;
}
