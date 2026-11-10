import { useState } from "react";
import { AvatarText, Button, Card, EmptyState, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { CoachSpecialtyModal } from "../../components/manager/CoachSpecialtyModal.jsx";
import { CreateCoachAccountModal } from "../../components/manager/CreateCoachAccountModal.jsx";
import { ConfirmDelete } from "../../components/common/ConfirmDelete.jsx";
import { coachApi, subjectApi, classApi } from "../../services/api/resources.js";
import { useQuery } from "../../store/useQuery.js";
import { useApp } from "../../store/useApp.js";

export function ManagerCoachesPage() {
  const { toast } = useApp();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editingCoachId, setEditingCoachId] = useState(null);
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const query = useQuery(async () => {
    const [coaches, subjects, classes] = await Promise.all([coachApi.list(), subjectApi.list(), classApi.list()]);
    return { coaches, subjects, classes };
  });
  return <>
    <PageHeader title="Huấn luyện viên" subtitle="Quản lý hồ sơ, chuyên môn và cấp tài khoản cho huấn luyện viên."
      action={<Button icon="userplus" disabled={query.loading || !!query.error} onClick={() => setCreating(true)}>Cấp tài khoản HLV</Button>} />
    <AsyncPanel query={query}>{data => {
      const subjectNames = new Map(data.subjects.map(subject => [subject.id, subject.name]));
      const needle = search.trim().toLocaleLowerCase("vi");
      const rows = data.coaches.filter(coach =>
        (!needle || [coach.name, coach.phone].filter(Boolean).join(" ").toLocaleLowerCase("vi").includes(needle)) &&
        (!subjectId || (subjectId === "unassigned" ? !coach.subjectIds?.length : coach.subjectIds?.includes(subjectId))));
      return <>
        <Card className="filters">
          <label className="field"><span>Tìm huấn luyện viên</span><input type="search" value={search} placeholder="Nhập tên hoặc số điện thoại" onChange={event => setSearch(event.target.value)} /></label>
          <SelectField label="Chuyên môn" value={subjectId} onChange={setSubjectId}>
            <option value="">Tất cả chuyên môn</option><option value="unassigned">Chưa khai báo</option>
            {data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </SelectField>
        </Card>
        <p role="status">{rows.length} huấn luyện viên</p>
        <Card className="table-card">{rows.length ? <table>
          <thead><tr><th>Huấn luyện viên</th><th>Số điện thoại</th><th>Chuyên môn</th><th>Lớp phụ trách</th><th>Thao tác</th></tr></thead>
          <tbody>{rows.map(coach => <tr key={coach.id}>
            <td><AvatarText name={coach.name} /></td><td>{coach.phone || "Chưa có thông tin"}</td>
            <td>{coach.subjectIds?.length ? coach.subjectIds.map(id => subjectNames.get(id) || "Bộ môn không còn tồn tại").join(", ") : "Chưa khai báo"}</td>
            <td>{data.classes.filter(cls => cls.coachId === coach.id).map(cls => cls.name).join(", ") || "Chưa phân công"}</td>
            <td><div className="delete-actions"><Button variant="secondary" onClick={() => setEditingCoachId(coach.id)}>Cập nhật chuyên môn</Button><Button variant="danger" onClick={() => setDeleting(coach)}>Xóa hồ sơ HLV</Button></div></td>
          </tr>)}</tbody>
        </table> : <EmptyState title={data.coaches.length ? "Không tìm thấy HLV phù hợp" : "Chưa có huấn luyện viên"} text="Cấp tài khoản để thêm huấn luyện viên mới." />}</Card>
        {creating && <CreateCoachAccountModal subjects={data.subjects} onClose={() => setCreating(false)} onDone={({ user }) => { setCreating(false); toast("Đã cấp tài khoản HLV: " + user.email); }} />}
        {editingCoachId !== null && <CoachSpecialtyModal key={editingCoachId} initialCoachId={editingCoachId} options={data} onClose={() => setEditingCoachId(null)} onDone={() => { setEditingCoachId(null); toast("Đã cập nhật chuyên môn HLV"); }} />}
      </>;
    }}</AsyncPanel>
    {deleting && <ConfirmDelete title="Xóa hồ sơ HLV" name={deleting.name} onClose={() => setDeleting(null)}
      onDelete={() => coachApi.remove(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa hồ sơ HLV"); }}>
      <p>Tài khoản đăng nhập được giữ lại. Không thể xóa HLV đang được phân lớp, có kế hoạch tập luyện hoặc bài tập.</p>
    </ConfirmDelete>}
  </>;
}
