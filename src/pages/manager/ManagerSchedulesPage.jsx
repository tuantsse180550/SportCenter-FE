import { calendarRange } from "../../utils/calendarRange.js";
import { useState } from "react";
import { Button, Field, SelectField, Modal, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { scheduleApi, roomApi, classApi, lessonApi } from "../../services/api/resources.js";
import { idOf } from "../../services/api/normalize.js";
import { ScheduleGroups } from "../../components/manager/ScheduleGroups.jsx";
import { ConfirmDelete } from "../../components/common/ConfirmDelete.jsx";
import { useApp } from "../../store/useApp.js";

function ScheduleForm({ initial, options, onClose }) {
  const [form, setForm] = useState(initial || { classId: "", lessonId: "", roomId: "", date: "", startTime: "", endTime: "", status: "SCHEDULED" });
  const mutation = useMutation(); const set = key => value => setForm(old => ({ ...old, [key]: value, ...(key === "classId" ? { lessonId: "" } : {}) }));
  const lessons = options.lessons.filter(l => idOf(l.classId) === form.classId);
  const submit = event => { event.preventDefault(); mutation.run(async () => {
    if (!form.classId || !form.lessonId || !form.roomId || !form.date || !form.startTime || !form.endTime || form.startTime >= form.endTime) throw new Error("Vui lòng chọn đủ thông tin và giờ kết thúc sau giờ bắt đầu.");
    return initial ? scheduleApi.update(initial.id, form) : scheduleApi.create(form);
  }, onClose); };
  return <Modal title={initial ? "Sửa lịch học" : "Thêm lịch học"} onClose={mutation.pending ? () => {} : onClose}><form className="form-grid" onSubmit={submit}><SelectField label="Lớp học" value={form.classId} onChange={set("classId")}><option value="">Chọn lớp</option>{options.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField><SelectField label="Bài học" value={form.lessonId} onChange={set("lessonId")}><option value="">Chọn bài học thuộc khóa của lớp</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</SelectField><SelectField label="Phòng học" value={form.roomId || ""} onChange={set("roomId")}><option value="">Chọn phòng đang hoạt động</option>{options.rooms.filter(r => r.status === "ACTIVE" || r.id === form.roomId).map(r => <option key={r.id} disabled={r.status !== "ACTIVE"} value={r.id}>{r.roomNumber} · {r.name}{r.status !== "ACTIVE" ? " (Ngừng hoạt động)" : ""}</option>)}</SelectField><Field label="Ngày học" required type="date" value={form.date} onChange={set("date")} /><Field label="Giờ bắt đầu" required type="time" value={form.startTime} onChange={set("startTime")} /><Field label="Giờ kết thúc" required type="time" value={form.endTime} onChange={set("endTime")} /><SelectField label="Trạng thái" value={form.status} onChange={set("status")}><option value="SCHEDULED">Đã xếp lịch</option><option value="COMPLETED">Đã hoàn thành</option><option value="CANCELLED">Đã hủy</option></SelectField><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending}>{mutation.pending ? "Đang lưu..." : "Lưu lịch"}</Button></form></Modal>;
}

export function ManagerSchedulesPage() {
  const [editing, setEditing] = useState(null); const [deleting, setDeleting] = useState(null); const [period, setPeriod] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "", classId: "", coachId: "", roomId: "" });
  const set = key => value => { if (key === "from" || key === "to") setPeriod(""); setFilter(old => ({ ...old, [key]: value })); };
  const { toast } = useApp();
  const query = useQuery(async () => { const [sessions, rooms, classes, lessons] = await Promise.all([scheduleApi.list(), roomApi.list(), classApi.list(), lessonApi.list()]); return { sessions, rooms, classes, lessons }; });
  return <><PageHeader title="Quản lý lịch học" action={<Button onClick={() => setEditing({})}>Thêm lịch học</Button>} /><AsyncPanel query={query}>{data => <>
    <div className="form-grid">
      <SelectField label="Khoảng thời gian" value={period} onChange={value => { setPeriod(value); setFilter(old => ({ ...old, ...calendarRange(value) })); }}><option value="">Tất cả / tùy chọn</option><option value="TODAY">Hôm nay</option><option value="WEEK">Tuần này</option><option value="MONTH">Tháng này</option></SelectField>
      <Field label="Lịch học từ ngày" type="date" value={filter.from} onChange={set("from")} /><Field label="Lịch học đến ngày" type="date" value={filter.to} onChange={set("to")} />
      <SelectField label="Lọc theo lớp" value={filter.classId} onChange={set("classId")}><option value="">Tất cả lớp</option>{data.classes.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField>
      <SelectField label="Lọc theo huấn luyện viên" value={filter.coachId} onChange={set("coachId")}><option value="">Tất cả huấn luyện viên</option>{[...new Map(data.classes.map(row => [row.coachId, row.coach?.name || row.coachId])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</SelectField>
      <SelectField label="Lọc theo phòng" value={filter.roomId} onChange={set("roomId")}><option value="">Tất cả phòng</option>{data.rooms.map(row => <option key={row.id} value={row.id}>{row.roomNumber} · {row.name}</option>)}</SelectField>
    </div>
    <ScheduleGroups sessions={data.sessions.filter(row => (!filter.from || row.date >= filter.from) && (!filter.to || row.date <= filter.to) && (!filter.classId || row.classId === filter.classId) && (!filter.coachId || row.coachId === filter.coachId) && (!filter.roomId || row.roomId === filter.roomId))} classes={data.classes} onEdit={setEditing} onDelete={setDeleting} />
    {editing && <ScheduleForm key={editing.id || "new"} initial={editing.id ? editing : null} options={data} onClose={() => setEditing(null)} />}
  </>}</AsyncPanel>
    {deleting && <ConfirmDelete title="Xóa lịch học" name={(deleting.classItem?.name || "Buổi học") + " · " + deleting.date + " " + deleting.startTime}
      onClose={() => setDeleting(null)} onDelete={() => scheduleApi.remove(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa lịch học"); }}>
      <p>Không thể xóa lịch đã có điểm danh hoặc kết quả tập luyện. Nội dung bài học của lớp được giữ lại.</p>
    </ConfirmDelete>}
  </>;
}
