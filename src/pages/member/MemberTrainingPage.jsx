import { Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { homeworkApi, lessonProgressApi, workoutPlanApi } from "../../services/api/resources.js";
import { useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";
import { uiLabel } from "../../utils/vietnamese.js";

export function MemberTrainingPage() {
  const query = useQuery(async () => { const [plans, progress, homework] = await Promise.all([workoutPlanApi.list(), lessonProgressApi.list(), homeworkApi.my()]); return { plans, progress, homework }; });
  return <><PageHeader title="Kế hoạch và phản hồi" subtitle="Hướng dẫn, bài tập và đánh giá của huấn luyện viên dành cho bạn." /><AsyncPanel query={query}>{({ plans, progress, homework }) => <>
    <h2>Kế hoạch tập luyện</h2><div className="card-grid">{plans.map(row => <Card key={row.id}><h3>{row.goal}</h3><p>{row.plan}</p><small>{row.coach?.name} · {row.classItem?.name || "Kế hoạch cá nhân"} · {uiLabel(row.level)}</small></Card>)}</div>{!plans.length && <EmptyState title="Chưa có kế hoạch được duyệt" />}
    <h2>Tiến bộ và nhận xét</h2><div className="card-grid">{progress.map(row => <Card key={row.id}><h3>{row.lessonId?.title}</h3><p>{row.classId?.name} · {uiLabel(row.status)}</p><p>{row.coachComment || "Chưa có nhận xét từ huấn luyện viên"}</p><small>{formatters.dateTime(row.evaluatedAt || row.updatedAt)}</small></Card>)}</div>{!progress.length && <EmptyState title="Chưa có đánh giá tiến bộ" />}
    <h2>Bài tập và thông báo lớp</h2><div className="card-grid">{homework.map(row => <Card key={row.id}><h3>{row.title}</h3><p>{row.description}</p><small>{row.dueDate ? "Hạn: " + formatters.date(row.dueDate) : "Không đặt hạn hoàn thành"} · {row.coachId?.fullName}</small></Card>)}</div>{!homework.length && <EmptyState title="Chưa có bài tập được giao" />}
  </>}</AsyncPanel></>;
}
