import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvatarText, Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { ClassFilters } from "../../components/manager/ClassFilters.jsx";
import { ClassFormModal } from "../../components/manager/ClassFormModal.jsx";
import { classService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
import { useApp } from "../../store/useApp.js";
export function ManagerClassesPage() {
  const navigate = useNavigate(); const { toast } = useApp(); const [filters, setFilters] = useState({ query: "", subjectId: "", coachId: "" }); const [creating, setCreating] = useState(false);
  const query = useQuery(async () => { const [classes, options] = await Promise.all([classService.listClasses(), classService.getFormOptions()]); return { classes, options }; });
  return <><PageHeader title="Quản lý lớp học" subtitle="Quản lý lớp học, bộ môn, khóa học và huấn luyện viên." action={<Button icon="plus" disabled={query.loading || !!query.error} onClick={() => setCreating(true)}>Tạo lớp học</Button>} /><AsyncPanel query={query}>{({ classes, options }) => {
    const needle = filters.query.trim().toLocaleLowerCase("vi");
    const visible = classes.filter(item => (!needle || [item.name, item.sport, item.coach?.name, item.course?.name].filter(Boolean).join(" ").toLocaleLowerCase("vi").includes(needle)) && (!filters.subjectId || item.subjectId === filters.subjectId) && (!filters.coachId || item.coachId === filters.coachId));
    return <><ClassFilters filters={filters} setFilters={setFilters} {...options} /><Card className="table-card">{visible.length ? <table><thead><tr><th>Lớp học</th><th>Huấn luyện viên</th><th>Bộ môn</th><th>Đã xác nhận</th><th>Chờ thanh toán</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id} onClick={() => navigate("/manager/classes/" + item.id)}><td><button type="button" className="table-entry-button" onClick={event => { event.stopPropagation(); navigate("/manager/classes/" + item.id); }}><AvatarText name={item.name} sub={item.course?.name} /></button></td><td>{item.coach?.name}</td><td>{item.sport}</td><td>{item.enrolledCount}</td><td>{item.pendingCount}</td></tr>)}</tbody></table> : <EmptyState title={classes.length ? "Không tìm thấy lớp học phù hợp" : "Chưa có lớp học"} />}</Card>{creating && <ClassFormModal title="Tạo lớp học" options={options} onClose={() => setCreating(false)} onSubmit={classService.createClass} onDone={() => { setCreating(false); toast("Đã tạo lớp học"); }} />}</>;
  }}</AsyncPanel></>;
}
