import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { CourseForm } from "../../components/manager/CourseForm.jsx";
import { ConfirmDelete } from "../../components/common/ConfirmDelete.jsx";
import { LearningPathEditorModal } from "../../components/manager/LearningPathEditorModal.jsx";
import { courseApi, subjectApi } from "../../services/api/resources.js";
import { idOf } from "../../services/api/normalize.js";
import { formatters } from "../../utils/formatters.js";
import { useQuery } from "../../store/useQuery.js";
import { useApp } from "../../store/useApp.js";

const courseFee = value => typeof value === "number" && Number.isFinite(value) && value >= 0
  ? formatters.money(value) : "Chưa thiết lập";

export function ManagerCoursesPage() {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useApp();
  const query = useQuery(async () => {
    const [courses, subjects] = await Promise.all([courseApi.list(), subjectApi.list()]);
    return { courses, subjects };
  });
  return <>
    <PageHeader title="Quản lý khóa học" subtitle="Tạo khóa học theo bộ môn, cập nhật học phí và quản lý giáo án." action={<Button icon="plus" onClick={() => setEditing({})}>Tạo khóa học</Button>} />
    <AsyncPanel query={query}>{({ courses, subjects }) => {
      const names = new Map(subjects.map(subject => [subject.id, subject.name]));
      const rows = courses.filter(course => (!subjectId || idOf(course.subjectId) === subjectId) &&
        (!status || course.status === status) && course.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
      return <>
        <div className="course-filters">
          <Field label="Tìm khóa học" value={search} onChange={setSearch} placeholder="Nhập tên khóa học" />
          <SelectField label="Bộ môn" value={subjectId} onChange={setSubjectId}><option value="">Tất cả bộ môn</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</SelectField>
          <SelectField label="Trạng thái" value={status} onChange={setStatus}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></SelectField>
        </div>
        <Card className="table-card">{rows.length ? <table>
          <thead><tr><th>Khóa học</th><th>Bộ môn</th><th>Học phí / học viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{rows.map(course => <tr key={course.id}>
            <td><strong>{course.name}</strong>{course.description && <p>{course.description}</p>}</td>
            <td>{names.get(idOf(course.subjectId)) || course.subjectId?.name || "Chưa có bộ môn"}</td>
            <td>{courseFee(course.price)}</td><td><Badge tone={course.status === "ACTIVE" ? "green" : "slate"}>{course.status}</Badge></td>
            <td><div className="course-actions"><Button variant="secondary" onClick={() => setEditing(course)}>Chỉnh sửa</Button><Button variant="ghost" onClick={() => setCurriculum(course)}>Giáo án</Button><Button variant="danger" onClick={() => setDeleting(course)}>Xóa khóa học</Button></div></td>
          </tr>)}</tbody>
        </table> : <EmptyState title={courses.length ? "Không tìm thấy khóa học phù hợp" : "Chưa có khóa học"} text="Tạo khóa học trước khi mở lớp cho bộ môn." />}</Card>
        {editing && <Modal title={editing.id ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"} onClose={pending ? () => {} : () => setEditing(null)}>
          <CourseForm key={editing.id || "new-course"} initial={editing} subjects={subjects} onPendingChange={setPending}
            onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); toast(editing.id ? "Đã cập nhật khóa học" : "Đã tạo khóa học"); }} />
        </Modal>}
        {curriculum && <LearningPathEditorModal courseId={curriculum.id} courseName={curriculum.name} onClose={() => setCurriculum(null)} />}
      </>;
    }}</AsyncPanel>
    {deleting && <ConfirmDelete title="Xóa khóa học" name={deleting.name} onClose={() => setDeleting(null)}
      onDelete={() => courseApi.remove(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa khóa học"); }}>
      <p>Không thể xóa khóa học đang có lớp học hoặc lộ trình.</p>
    </ConfirmDelete>}
  </>;
}
