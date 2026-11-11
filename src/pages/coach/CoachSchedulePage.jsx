import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionTimeline } from "../../components/common/DataViews.jsx";
import { Card, Field, PageHeader, SummaryGrid } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { scheduleService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
export function CoachSchedulePage() { const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const navigate = useNavigate(); const { user } = useApp(); const query = useQuery(() => scheduleService.getCoachScheduleSummary(user.coachId), [user.coachId]); return <><PageHeader title="Lịch dạy" subtitle="Các buổi dạy thuộc lớp được phân công cho bạn." /><AsyncPanel query={query}>{(s) => <><SummaryGrid items={[{ label: "Lớp được phân công", value: s.classCount }, { label: "Học viên được phân công", value: s.memberCount }, { label: "Hôm nay", value: s.today.length }, { label: "Buổi học sắp tới", value: s.upcoming.length }, { label: "Đã hoàn thành", value: s.completed.length }]} /><Card><h2>Lớp được phân công</h2>{s.assignedClasses.length ? s.assignedClasses.map(row => <p key={row.id}>{row.name} · {row.course?.name || row.sport}</p>) : <p>Chưa được phân công lớp học.</p>}</Card><div className="form-grid"><Field type="date" label="Lịch dạy từ ngày" value={from} onChange={setFrom} /><Field type="date" label="Lịch dạy đến ngày" value={to} onChange={setTo} /></div><Card><SessionTimeline sessions={s.sessions.filter(row => (!from || row.date >= from) && (!to || row.date <= to))} onOpen={(id) => navigate("/coach/sessions/" + id)} /></Card></>}</AsyncPanel></>; }
