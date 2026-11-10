import { useState } from "react";
import { Button, Field, Modal, SelectField } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { useMutation } from "../../store/useQuery.js";
import { idOf } from "../../services/api/normalize.js";
import { classFormChoices } from "./classFormChoices.js";
import { CourseForm } from "./CourseForm.jsx";
import { classTuition } from "../../utils/classTuition.js";
import { formatters } from "../../utils/formatters.js";
export function ClassFormModal({ title, options, initial, onClose, onSubmit, onDone }) {
  const [form, setForm] = useState(() => ({ name: initial?.name || "", subjectId: initial?.subjectId || "", courseId: initial?.courseId || "", coachId: initial?.coachId || "" }));
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [coursePending, setCoursePending] = useState(false);
  const [createdCourses, setCreatedCourses] = useState([]);
  const mutation = useMutation();
  const busy = mutation.pending || coursePending;
  const update = (key, value) => setForm(old => ({ ...old, [key]: value, ...(key === "subjectId" ? { courseId: "", coachId: "" } : {}) }));
  const courses = [...new Map([...options.courses, ...createdCourses].map(course => [course.id, course])).values()];
  const choices = classFormChoices({ ...options, courses }, form.subjectId, initial?.id, initial?.courseId);
  const tuition = classTuition({ course: choices.courses.find(c => c.id === form.courseId) });
  const valid = form.name.trim() && form.subjectId && choices.courses.some(c => c.id === form.courseId) && choices.coaches.some(c => c.id === form.coachId);
  const save = () => mutation.run(() => {
    if (!valid) throw new Error("Vui lòng chọn khóa học thuộc bộ môn và huấn luyện viên còn trống.");
    return onSubmit({ ...form, name: form.name.trim() });
  }, onDone);
  const close = () => creatingCourse ? setCreatingCourse(false) : onClose();
  return <Modal title={creatingCourse ? "Tạo khóa học mới" : title} onClose={busy ? () => {} : close} footer={creatingCourse ? null : <>
    <Button disabled={busy} variant="secondary" onClick={onClose}>Hủy</Button>
    <Button disabled={busy || !valid} onClick={save}>{mutation.pending ? "Đang lưu..." : "Lưu"}</Button>
  </>}>
    {creatingCourse ? <CourseForm subjects={options.subjects} fixedSubjectId={form.subjectId} onPendingChange={setCoursePending}
      onCancel={() => setCreatingCourse(false)} cancelLabel="Quay lại lớp học" onSaved={course => {
        setCreatedCourses(old => [...old.filter(item => item.id !== course.id), course]);
        setForm(old => ({ ...old, courseId: course.id }));
        setCreatingCourse(false);
      }} /> : <>
    <ErrorMessage error={mutation.error} />
    <div className="form-grid">
      <Field label="Tên lớp học" value={form.name} onChange={v => update("name", v)} />
      <SelectField label="Bộ môn" disabled={mutation.pending} value={form.subjectId} onChange={v => update("subjectId", v)}>
        <option value="">Chọn bộ môn</option>{options.subjects.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </SelectField>
      <div className="course-select-with-create">
        <SelectField label="Khóa học" disabled={!form.subjectId || mutation.pending} value={form.courseId} onChange={v => update("courseId", v)}>
          <option value="">{!form.subjectId ? "Chọn bộ môn trước" : choices.courses.length ? "Chọn khóa học" : "Bộ môn chưa có khóa học"}</option>
          {choices.courses.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </SelectField>
        <Button icon="plus" variant="secondary" disabled={!form.subjectId || busy} onClick={() => setCreatingCourse(true)}>Tạo khóa học mới</Button>
        {!form.subjectId && <p>Chọn bộ môn trước khi tạo khóa học.</p>}
      </div>
      <SelectField label="Huấn luyện viên" disabled={!form.subjectId || mutation.pending} value={form.coachId} onChange={v => update("coachId", v)}>
        <option value="">{!form.subjectId ? "Chọn bộ môn trước" : choices.coaches.length ? "Chọn huấn luyện viên đúng chuyên môn" : "Không có HLV đúng chuyên môn còn trống"}</option>
        {choices.coaches.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </SelectField>
    </div>
    {form.courseId && <p>Học phí trọn khóa mỗi học viên: {Number.isFinite(tuition) ? formatters.money(tuition) : "Chưa được thiết lập"}.</p>}
    {form.subjectId && options.courses.some(course => !idOf(course.subjectId)) && <p role="status">Một số khóa học chưa có thông tin bộ môn từ hệ thống nên chưa thể chọn. Vui lòng cập nhật bộ môn của khóa học trước khi tạo lớp.</p>}
    <p>Chỉ hiển thị HLV đúng chuyên môn và còn trống hoặc đang phụ trách lớp này. Mỗi HLV chỉ được phân công một lớp.</p>
    {options.coaches.some(coach => !coach.subjectIds?.length) && <p>Một số HLV chưa khai báo chuyên môn. Vào mục “Huấn luyện viên” để cập nhật trước khi phân công.</p>}
    </>}
  </Modal>;
}
