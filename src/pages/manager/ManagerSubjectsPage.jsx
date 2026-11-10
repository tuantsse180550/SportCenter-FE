import { useState } from "react";
import { Button, Card, EmptyState, Field, Modal, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { SubjectForm } from "../../components/manager/SubjectForm.jsx";
import { ConfirmDelete } from "../../components/common/ConfirmDelete.jsx";
import { subjectApi } from "../../services/api/resources.js";
import { useQuery } from "../../store/useQuery.js";
import { useApp } from "../../store/useApp.js";

export function ManagerSubjectsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pending, setPending] = useState(false);
  const { toast } = useApp();
  const query = useQuery(() => subjectApi.list());
  return <>
    <PageHeader title="Quản lý bộ môn" subtitle="Thêm bộ môn và cập nhật tên bộ môn cho các khóa học."
      action={<Button icon="plus" onClick={() => setEditing({})}>Thêm bộ môn</Button>} />
    <div className="subject-search"><Field label="Tìm bộ môn" value={search} onChange={setSearch} placeholder="Nhập tên bộ môn" /></div>
    <AsyncPanel query={query}>{subjects => {
      const rows = subjects.filter(subject => subject.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
      return <Card className="table-card subject-table">{rows.length ? <table>
        <thead><tr><th>Tên bộ môn</th><th>Thao tác</th></tr></thead>
        <tbody>{rows.map(subject => <tr key={subject.id}>
          <td><strong>{subject.name}</strong></td>
          <td><div className="delete-actions"><Button variant="secondary" onClick={() => setEditing(subject)}>Đổi tên</Button><Button variant="danger" onClick={() => setDeleting(subject)}>Xóa bộ môn</Button></div></td>
        </tr>)}</tbody>
      </table> : <EmptyState title={subjects.length ? "Không tìm thấy bộ môn phù hợp" : "Chưa có bộ môn"}
        text={subjects.length ? "Thử tìm bằng tên bộ môn khác." : "Thêm bộ môn để tạo khóa học và phân công chuyên môn cho HLV."} />}</Card>;
    }}</AsyncPanel>
    {editing && <Modal title={editing.id ? "Đổi tên bộ môn" : "Thêm bộ môn mới"} onClose={pending ? () => {} : () => setEditing(null)}>
      <SubjectForm key={editing.id || "new-subject"} initial={editing} onPendingChange={setPending}
        onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); toast(editing.id ? "Đã cập nhật tên bộ môn" : "Đã thêm bộ môn"); }} />
    </Modal>}
    {deleting && <ConfirmDelete title="Xóa bộ môn" name={deleting.name} onClose={() => setDeleting(null)}
      onDelete={() => subjectApi.remove(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa bộ môn"); }}>
      <p>Chỉ xóa được bộ môn chưa được khóa học, lớp học hoặc HLV sử dụng.</p>
    </ConfirmDelete>}
  </>;
}
