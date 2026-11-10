import { useState } from "react";
import { Button, Card, EmptyState, Modal } from "../common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../common/AsyncPanel.jsx";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { lessonApi } from "../../services/api/resources.js";
import { LearningPathEditorModal } from "./LearningPathEditorModal.jsx";
import { ConfirmDelete } from "../common/ConfirmDelete.jsx";
import { useApp } from "../../store/useApp.js";

function LessonContentForm({ lesson, onClose }) {
  const [title, setTitle] = useState(lesson.title || "");
  const [description, setDescription] = useState(lesson.description || "");
  const mutation = useMutation();
  const submit = event => {
    event.preventDefault();
    if (!title.trim()) return;
    mutation.run(() => lessonApi.update(lesson.id, { title: title.trim(), description: description.trim() }), onClose);
  };
  return <Modal title="Nội dung bài học" onClose={mutation.pending ? () => {} : onClose}>
    <form onSubmit={submit} className="form-grid">
      <label className="field"><span>Tên bài học</span><input required disabled={mutation.pending} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="field"><span>Nội dung giảng dạy</span><textarea rows={6} disabled={mutation.pending} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <ErrorMessage error={mutation.error} />
      <Button type="submit" disabled={mutation.pending || !title.trim()}>{mutation.pending ? "Đang lưu..." : "Lưu nội dung"}</Button>
    </form>
  </Modal>;
}

export function ClassLessons({ classId, courseId, courseName }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { toast } = useApp();
  const [curriculum, setCurriculum] = useState(false);
  const query = useQuery(() => lessonApi.forClass(classId), [classId]);
  return <Card><h2>Nội dung học của lớp</h2>{courseId && <Button variant="secondary" onClick={() => setCurriculum(true)}>Quản lý giáo án khóa học</Button>}<AsyncPanel query={query}>{lessons => lessons.length ?
    <div className="stack-list">{lessons.map(lesson => <section key={lesson.id}>
      <h3>Buổi {lesson.order}{/^(Buổi|Bài)\s+\d+$/iu.test(lesson.title) ? "" : ": " + lesson.title}</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>{lesson.description || "Chưa có mô tả nội dung bài học."}</p>
      {lesson.learningPathId?.name && <p>Lộ trình: {lesson.learningPathId.name}</p>}
      <Button variant="secondary" onClick={() => setEditing(lesson)}>{lesson.description ? "Sửa nội dung" : "Bổ sung nội dung"}</Button>
      <Button variant="danger" onClick={() => setDeleting(lesson)}>Xóa bài học</Button>
    </section>)}</div> : <EmptyState title="Chưa có nội dung học cho lớp này" />
  }</AsyncPanel>{editing && <LessonContentForm key={editing.id} lesson={editing} onClose={() => setEditing(null)} />}{curriculum && <LearningPathEditorModal courseId={courseId} courseName={courseName} onClose={() => setCurriculum(false)} />}
    {deleting && <ConfirmDelete title="Xóa bài học của lớp" name={"Buổi " + deleting.order + ": " + deleting.title} onClose={() => setDeleting(null)}
      onDelete={() => lessonApi.remove(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa bài học của lớp"); }}>
      <p>Không thể xóa bài học đã có lịch, điểm danh hoặc tiến độ học. Bài mẫu của khóa học được giữ nguyên.</p>
    </ConfirmDelete>}
  </Card>;
}
