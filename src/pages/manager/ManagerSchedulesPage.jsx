import { useState } from "react";
import { Button, Card, EmptyState, Field, SelectField, Modal, PageHeader, Badge } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { scheduleApi, roomApi, classApi, lessonApi, learningPathApi } from "../../services/api/resources.js";

function ScheduleForm({ initial, options, onClose }) {
  const [form, setForm] = useState(initial || { classId: "", lessonId: "", roomId: "", date: "", startTime: "", endTime: "", status: "SCHEDULED" });
  const mutation = useMutation(); const set = key => value => setForm(old => ({ ...old, [key]: value, ...(key === "classId" ? { lessonId: "" } : {}) }));
  const cls = options.classes.find(c => c.id === form.classId);
  const paths = new Set(options.paths.filter(p => (typeof p.courseId === "object" ? p.courseId?._id || p.courseId?.id : p.courseId) === cls?.courseId).map(p => p.id));
  const lessons = options.lessons.filter(l => paths.has(typeof l.learningPathId === "object" ? l.learningPathId?._id || l.learningPathId?.id : l.learningPathId));
  const submit = event => { event.preventDefault(); mutation.run(async () => {
    if (!form.classId || !form.lessonId || !form.roomId || !form.date || !form.startTime || !form.endTime || form.startTime >= form.endTime) throw new Error("Vui lòng chọn đủ thông tin và giờ kết thúc sau giờ bắt đầu.");
    return initial ? scheduleApi.update(initial.id, form) : scheduleApi.create(form);
  }, onClose); };
  return <Modal title={initial ? "Sửa lịch học" : "Thêm lịch học"} onClose={mutation.pending ? () => {} : onClose}><form className="form-grid" onSubmit={submit}><SelectField label="Lớp học" value={form.classId} onChange={set("classId")}><option value="">Chọn lớp</option>{options.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField><SelectField label="Bài học" value={form.lessonId} onChange={set("lessonId")}><option value="">Chọn bài học thuộc khóa của lớp</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</SelectField><SelectField label="Phòng học" value={form.roomId || ""} onChange={set("roomId")}><option value="">Chọn phòng đang hoạt động</option>{options.rooms.filter(r => r.status === "ACTIVE" || r.id === form.roomId).map(r => <option key={r.id} disabled={r.status !== "ACTIVE"} value={r.id}>{r.roomNumber} · {r.name}{r.status !== "ACTIVE" ? " (Ngừng hoạt động)" : ""}</option>)}</SelectField><Field label="Ngày học" required type="date" value={form.date} onChange={set("date")} /><Field label="Giờ bắt đầu" required type="time" value={form.startTime} onChange={set("startTime")} /><Field label="Giờ kết thúc" required type="time" value={form.endTime} onChange={set("endTime")} /><SelectField label="Trạng thái" value={form.status} onChange={set("status")}><option value="SCHEDULED">Đã xếp lịch</option><option value="COMPLETED">Đã hoàn thành</option><option value="CANCELLED">Đã hủy</option></SelectField><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending}>{mutation.pending ? "Đang lưu..." : "Lưu lịch"}</Button></form></Modal>;
}
export function ManagerSchedulesPage() {
  const [editing, setEditing] = useState(null);
  const query = useQuery(async () => { const [sessions, rooms, classes, lessons, paths] = await Promise.all([scheduleApi.list(), roomApi.list(), classApi.list(), lessonApi.list(), learningPathApi.list()]); return { sessions, rooms, classes, lessons, paths }; });
  return <><PageHeader title="Quản lý lịch học" action={<Button onClick={() => setEditing({})}>Thêm lịch học</Button>} /><AsyncPanel query={query}>{data => <><Card>{data.sessions.length ? <div className="stack-list">{data.sessions.map(s => <div key={s.id}><div><strong>{s.classItem?.name}</strong><p>{s.date} · {s.startTime}–{s.endTime} · {s.lesson?.title}</p><p>Phòng: {s.room ? s.room.roomNumber + " · " + s.room.name : "Chưa có thông tin"}</p><Badge>{s.status}</Badge></div><Button onClick={() => setEditing(s)}>Sửa lịch</Button></div>)}</div> : <EmptyState title="Chưa có lịch học" />}</Card>{editing && <ScheduleForm key={editing.id || "new"} initial={editing.id ? editing : null} options={data} onClose={() => setEditing(null)} />}</>}</AsyncPanel></>;
}
