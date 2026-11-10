import { useState } from "react";
import { Button, Field, SelectField } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { courseApi } from "../../services/api/resources.js";
import { idOf } from "../../services/api/normalize.js";
import { useMutation } from "../../store/useQuery.js";
import { SubjectForm } from "./SubjectForm.jsx";
import "./course-form.css";
import { courseTuition } from "../../utils/classTuition.js";

export function CourseForm({ subjects, initial, fixedSubjectId = "", onSaved, onCancel, onPendingChange, cancelLabel = "Hủy" }) {
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [createdSubjects, setCreatedSubjects] = useState([]);
  const availableSubjects = [...new Map([...subjects, ...createdSubjects].map(subject => [subject.id, subject])).values()];
  const [form, setForm] = useState(() => ({
    subjectId: fixedSubjectId || idOf(initial?.subjectId),
    name: initial?.name || "", description: initial?.description || "",
    price: courseTuition(initial) === undefined ? "" : String(courseTuition(initial)),
    status: initial?.status || "ACTIVE",
  }));
  const mutation = useMutation();
  const set = key => value => setForm(old => ({ ...old, [key]: value }));
  const submit = event => {
    event.preventDefault();
    mutation.run(async () => {
      onPendingChange?.(true);
      try {
        if (!availableSubjects.some(subject => subject.id === form.subjectId)) throw new Error("Vui lòng chọn bộ môn của khóa học.");
        if (!form.name.trim()) throw new Error("Vui lòng nhập tên khóa học.");
        const price = Number(form.price);
        if (!form.price.trim() || !Number.isSafeInteger(price) || price < 0) throw new Error("Học phí mỗi học viên phải là số nguyên VNĐ từ 0 trở lên.");
        const payload = {
          subjectId: form.subjectId, name: form.name.trim(), description: form.description.trim(),
          price, status: fixedSubjectId ? "ACTIVE" : form.status,
        };
        return initial?.id ? await courseApi.update(initial.id, payload) : await courseApi.create(payload);
      } finally { onPendingChange?.(false); }
    }, onSaved);
  };
  if (creatingSubject) return <section>
    <h3 className="subject-inline-heading">Thêm bộ môn cho khóa học</h3>
    <SubjectForm onPendingChange={onPendingChange} cancelLabel="Quay lại khóa học" onCancel={() => setCreatingSubject(false)}
      onSaved={subject => {
        setCreatedSubjects(old => [...old.filter(item => item.id !== subject.id), subject]);
        setForm(old => ({ ...old, subjectId: subject.id }));
        setCreatingSubject(false);
      }} />
  </section>;
  return <form className="course-editor" onSubmit={submit}>
    <fieldset className="form-grid course-form-fields" disabled={mutation.pending}>
      <div className="course-select-with-create">
        <SelectField label="Bộ môn" value={form.subjectId} disabled={!!fixedSubjectId || mutation.pending} onChange={set("subjectId")}>
          <option value="">Chọn bộ môn</option>{availableSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </SelectField>
        {!fixedSubjectId && <Button icon="plus" variant="secondary" disabled={mutation.pending} onClick={() => setCreatingSubject(true)}>Thêm bộ môn</Button>}
      </div>
      <Field label="Tên khóa học" required value={form.name} onChange={set("name")} />
      <label className="field"><span>Học phí mỗi học viên (VNĐ)</span><input required type="number" min="0" step="1" placeholder="Ví dụ: 500000" value={form.price} onChange={event => set("price")(event.target.value)} /></label>
      {!fixedSubjectId && <SelectField label="Trạng thái" value={form.status} onChange={set("status")}>
        <option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option>
      </SelectField>}
      <label className="field course-description"><span>Mô tả khóa học</span><textarea rows={4} value={form.description} onChange={event => set("description")(event.target.value)} /></label>
    </fieldset>
    <p>Đây là học phí trọn khóa cho một học viên. Mỗi học viên đăng ký lớp thanh toán riêng mức phí này; học phí không chia theo sĩ số lớp.</p>
    {!availableSubjects.length && <p role="alert">Chưa có bộ môn trong hệ thống. Bấm “Thêm bộ môn” để tạo trước khi lưu khóa học.</p>}
    <ErrorMessage error={mutation.error} />
    <div className="course-actions">
      <Button variant="secondary" disabled={mutation.pending} onClick={onCancel}>{cancelLabel}</Button>
      <Button type="submit" disabled={mutation.pending || !availableSubjects.length}>{mutation.pending ? "Đang lưu..." : initial?.id ? "Lưu khóa học" : "Tạo khóa học"}</Button>
    </div>
  </form>;
}
