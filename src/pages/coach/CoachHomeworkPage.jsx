import { useState } from "react";
import { Button, Card, EmptyState, Field, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { homeworkApi } from "../../services/api/resources.js";
import { trainingPlanService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

export function CoachHomeworkPage() {
  const { user, toast } = useApp();
  const query = useQuery(async () => ({ options: await trainingPlanService.getFormOptions(user.coachId), rows: await homeworkApi.my() }), [user.coachId]);
  const [target, setTarget] = useState("classId"); const [targetId, setTargetId] = useState(""); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [dueDate, setDueDate] = useState(""); const mutation = useMutation();
  return <><PageHeader title="Bài tập và thông báo lớp" subtitle="Gửi hướng dẫn đến học viên đã xác nhận đăng ký trong lớp được phân công." /><AsyncPanel query={query}>{({ options, rows }) => <><Card><form onSubmit={event => { event.preventDefault(); mutation.run(() => homeworkApi.create({ [target]: targetId, title, description, ...(dueDate ? { dueDate } : {}) }), data => { toast("Đã gửi cho " + data.recipientCount + " học viên"); setTitle(""); setDescription(""); query.reload(); }); }}><div className="form-grid">
    <SelectField label="Gửi đến" value={target} onChange={value => { setTarget(value); setTargetId(""); }}><option value="classId">Cả lớp</option><option value="memberId">Một học viên</option></SelectField><SelectField label="Người nhận" value={targetId} onChange={setTargetId}><option value="">Chọn người nhận</option>{(target === "classId" ? options.classes : options.members).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField><Field required label="Tiêu đề" value={title} onChange={setTitle} /><Field type="date" label="Hạn hoàn thành (không bắt buộc)" value={dueDate} onChange={setDueDate} /></div><label className="field"><span>Hướng dẫn / thông báo</span><textarea required value={description} onChange={event => setDescription(event.target.value)} /></label><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending || !targetId || !title.trim() || !description.trim()}>Gửi bài tập / thông báo</Button></form></Card>
    <h2>Lịch sử đã gửi</h2>{rows.length ? <div className="card-grid">{rows.map(row => <Card key={row.id}><h3>{row.title}</h3><p>{row.description}</p><p>{row.classId?.name || row.memberId?.fullName}</p><small>Đã gửi: {formatters.dateTime(row.createdAt)}{row.dueDate ? " · Hạn: " + formatters.date(row.dueDate) : ""}</small></Card>)}</div> : <EmptyState title="Chưa gửi bài tập hoặc thông báo" />}</>}</AsyncPanel></>;
}
