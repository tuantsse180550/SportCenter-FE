import { useState } from "react";
import { Button, EmptyState, Modal, SelectField } from "../common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../common/AsyncPanel.jsx";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { learningPathApi, lessonApi } from "../../services/api/resources.js";
import { idOf } from "../../services/api/normalize.js";
import { ConfirmDelete } from "../common/ConfirmDelete.jsx";
import { useApp } from "../../store/useApp.js";

function LessonTemplateForm({ lesson, pathId, nextOrder, onSaved, onPending }) {
  const [form, setForm] = useState({ title: lesson?.title || "", description: lesson?.description || "", order: lesson?.order || nextOrder });
  const mutation = useMutation();
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const submit = event => {
    event.preventDefault();
    onPending(true);
    const body = { classId: null, learningPathId: pathId, title: form.title.trim(), description: form.description.trim(), order: Number(form.order) };
    mutation.run(() => lesson?.id ? lessonApi.update(lesson.id, body) : lessonApi.create(body), onSaved).finally(() => onPending(false));
  };
  return <form className="form-grid" onSubmit={submit}>
    <label className="field"><span>Thứ tự buổi</span><input type="number" min="1" step="1" required disabled={mutation.pending} value={form.order} onChange={event => set("order", event.target.value)} /></label>
    <label className="field"><span>Tiêu đề ngắn của buổi học</span><input required disabled={mutation.pending} placeholder="Ví dụ: Tư thế và nhịp thở" value={form.title} onChange={event => set("title", event.target.value)} /></label>
    <label className="field"><span>Nội dung giảng dạy</span><textarea required rows={5} disabled={mutation.pending} value={form.description} onChange={event => set("description", event.target.value)} /></label>
    <ErrorMessage error={mutation.error} />
    <div className="class-actions"><Button type="submit" disabled={mutation.pending || !form.title.trim() || !form.description.trim()}>Lưu bài mẫu</Button><Button variant="secondary" disabled={mutation.pending} onClick={onSaved}>Hủy</Button></div>
  </form>;
}

function PathForm({ path, courseId, onSaved, onPending }) {
  const [name, setName] = useState(path?.name || "");
  const [description, setDescription] = useState(path?.description || "");
  const mutation = useMutation();
  const submit = event => {
    event.preventDefault(); onPending(true);
    const body = { courseId, name: name.trim(), description: description.trim() };
    mutation.run(() => path?.id ? learningPathApi.update(path.id, body) : learningPathApi.create(body), onSaved).finally(() => onPending(false));
  };
  return <form className="form-grid" onSubmit={submit}>
    <label className="field"><span>Tên lộ trình</span><input required disabled={mutation.pending} value={name} onChange={event => setName(event.target.value)} /></label>
    <label className="field"><span>Mô tả lộ trình</span><textarea rows={3} disabled={mutation.pending} value={description} onChange={event => setDescription(event.target.value)} /></label>
    <ErrorMessage error={mutation.error} />
    <div className="class-actions"><Button type="submit" disabled={mutation.pending || !name.trim()}>Lưu lộ trình</Button><Button variant="secondary" disabled={mutation.pending} onClick={() => onSaved()}>Hủy</Button></div>
  </form>;
}

export function LearningPathEditorModal({ courseId, courseName, onClose }) {
  const [selected, setSelected] = useState("");
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingPath, setEditingPath] = useState(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const { toast } = useApp();
  const busy = pending || !!deleting;
  const query = useQuery(async () => {
    const [paths, templates] = await Promise.all([learningPathApi.list(), lessonApi.templates()]);
    return { paths: paths.filter(path => idOf(path.courseId) === courseId), templates };
  }, [courseId]);
  return <Modal title="Quản lý giáo án khóa học" onClose={pending ? () => {} : deleting ? () => setDeleting(null) : onClose}>
    <p>Khóa học: <strong>{courseName}</strong>. Bài mẫu được dùng chung cho các lớp của khóa học này. Sửa bài mẫu không thay đổi giáo án đã sao chép vào lớp.</p>
    <AsyncPanel query={query}>{({ paths, templates }) => {
      const path = paths.find(item => item.id === selected) || paths[0];
      const lessons = templates.filter(item => idOf(item.learningPathId) === path?.id).sort((a, b) => a.order - b.order);
      return <>
        <SelectField label="Lộ trình của khóa học" disabled={busy} value={path?.id || ""} onChange={value => { setSelected(value); setEditingLesson(null); setEditingPath(null); }}>
          {!paths.length && <option value="">Chưa có lộ trình</option>}{paths.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectField>
        <div className="class-actions"><Button disabled={busy} onClick={() => { setEditingPath({}); setEditingLesson(null); }}>Tạo lộ trình</Button>{path && <><Button disabled={busy} variant="secondary" onClick={() => { setEditingPath(path); setEditingLesson(null); }}>Sửa lộ trình</Button><Button disabled={busy} variant="danger" onClick={() => { setEditingPath(null); setEditingLesson(null); setDeleting({ type: "path", item: path }); }}>Xóa lộ trình</Button></>}</div>
        {editingPath && <PathForm key={editingPath.id || "new-path"} path={editingPath} courseId={courseId} onPending={setPending} onSaved={saved => { if (saved) setSelected(saved.id); setEditingPath(null); }} />}
        {path && <>
          <p>{path.description}</p>
          <h3>Giáo án mẫu · {lessons.length} buổi</h3>
          {lessons.length ? <div className="stack-list">{lessons.map(lesson => <section key={lesson.id}>
            <strong>Buổi {lesson.order}: {lesson.title}</strong><p style={{ whiteSpace: "pre-wrap" }}>{lesson.description || "Chưa có nội dung giảng dạy"}</p>
            <div className="class-actions"><Button disabled={busy} variant="secondary" onClick={() => { setEditingLesson(lesson); setEditingPath(null); }}>Sửa bài mẫu</Button>
              <Button disabled={busy} variant="danger" onClick={() => { setEditingPath(null); setEditingLesson(null); setDeleting({ type: "lesson", item: lesson }); }}>Xóa bài mẫu</Button></div>
          </section>)}</div> : <EmptyState title="Chưa có bài mẫu" text="Thêm nội dung từng buổi trước khi import lịch học." />}
          {!editingLesson && <Button disabled={busy} onClick={() => { setEditingLesson({}); setEditingPath(null); }}>Thêm bài mẫu</Button>}
          {editingLesson && <LessonTemplateForm key={path.id + (editingLesson.id || "new-lesson")} lesson={editingLesson} pathId={path.id} nextOrder={Math.max(0, ...lessons.map(item => item.order)) + 1} onPending={setPending} onSaved={() => setEditingLesson(null)} />}
        </>}
      </>;
    }}</AsyncPanel>
    {deleting && <ConfirmDelete inline title={deleting.type === "path" ? "Xóa lộ trình" : "Xóa bài mẫu"}
      name={deleting.item.name || deleting.item.title} onPendingChange={setPending} onClose={() => setDeleting(null)}
      onDelete={() => deleting.type === "path" ? learningPathApi.remove(deleting.item.id) : lessonApi.remove(deleting.item.id)}
      onDeleted={() => { if (deleting.type === "path") setSelected(""); toast(deleting.type === "path" ? "Đã xóa lộ trình" : "Đã xóa bài mẫu"); setDeleting(null); }}>
      <p>{deleting.type === "path" ? "Chỉ xóa được lộ trình chưa có bài mẫu hoặc bài học của lớp tham chiếu." : "Các bài học đã sao chép vào lớp được giữ nguyên."}</p>
    </ConfirmDelete>}
  </Modal>;
}
