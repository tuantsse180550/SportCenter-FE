import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { MemberTable } from "../../components/common/DataViews.jsx";
import { Card, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { MemberDrawer } from "../../components/manager/MemberDrawer.jsx";
import { ConfirmDelete } from "../../components/common/ConfirmDelete.jsx";
import { memberApi } from "../../services/api/resources.js";
import { useApp } from "../../store/useApp.js";
import { memberService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
export function ManagerMembersPage() {
  const [deleting, setDeleting] = useState(null);
  const { toast } = useApp();
  const [filters, setFilters] = useState({ query: "", level: "" }); const [selectedId, setSelectedId] = useState(null); const query = useQuery(() => memberService.listMembers(filters), [filters]);
  return <><PageHeader title="Thành viên" subtitle="Hồ sơ thành viên và thông tin đăng ký lớp học." /><Card className="filters"><input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Tìm tên, số điện thoại, mã thành viên..." /><select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}><option value="">Tất cả trình độ</option>{["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((v) => <option key={v} value={v}>{uiLabel(v)}</option>)}</select></Card><AsyncPanel query={query}>{members => {
    const selected = members.find(m => m.id === selectedId);
    return <><MemberTable members={members} onOpen={m => setSelectedId(m.id)} />{selected && <MemberDrawer member={selected} onClose={() => setSelectedId(null)} onDelete={() => { setSelectedId(null); setDeleting(selected); }} />}</>;
  }}</AsyncPanel>
    {deleting && <ConfirmDelete title="Xóa hồ sơ học viên" name={deleting.name} onClose={() => setDeleting(null)}
      onDelete={() => memberApi.remove(deleting.id)} onDeleted={() => { setDeleting(null); toast("Đã xóa hồ sơ học viên"); }}>
      <p>Tài khoản đăng nhập được giữ lại. Không thể xóa hồ sơ đã có đăng ký, điểm danh, tiến độ, kế hoạch, kết quả hoặc bài tập liên quan.</p>
    </ConfirmDelete>}
  </>;
}
