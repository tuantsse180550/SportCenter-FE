import { useNavigate } from "react-router-dom";
import { SessionTimeline } from "../../components/common/DataViews.jsx";
import { Card, PageHeader, SummaryGrid } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { scheduleService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
export function CoachSchedulePage() { const navigate = useNavigate(); const { user } = useApp(); const query = useQuery(() => scheduleService.getCoachScheduleSummary(user.coachId), [user.coachId]); return <><PageHeader title="Lịch dạy" subtitle="Các buổi dạy thuộc lớp được phân công cho bạn." /><AsyncPanel query={query}>{(s) => <><SummaryGrid items={[{ label: "Hôm nay", value: s.today.length }, { label: "Đã xếp lịch", value: s.upcoming.length }, { label: "Đã hoàn thành", value: s.completed.length }]} /><Card><SessionTimeline sessions={s.sessions} onOpen={(id) => navigate("/coach/sessions/" + id)} /></Card></>}</AsyncPanel></>; }
