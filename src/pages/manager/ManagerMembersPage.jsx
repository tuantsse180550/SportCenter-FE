import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { MemberTable } from "../../components/common/DataViews.jsx";
import { Card, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { MemberDrawer } from "../../components/manager/MemberDrawer.jsx";
import { memberService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
export function ManagerMembersPage() {
  const [filters, setFilters] = useState({ query: "", level: "" }); const [selectedId, setSelectedId] = useState(null); const query = useQuery(() => memberService.listMembers(filters), [filters]);
  return <><PageHeader title="Thành viên" subtitle="Hồ sơ thành viên và thông tin đăng ký lớp học." /><Card className="filters"><input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Tìm tên, số điện thoại, mã thành viên..." /><select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}><option value="">Tất cả trình độ</option>{["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((v) => <option key={v} value={v}>{uiLabel(v)}</option>)}</select></Card><AsyncPanel query={query}>{(members) => <><MemberTable members={members} onOpen={(m) => setSelectedId(m.id)} />{members.find((m) => m.id === selectedId) && <MemberDrawer member={members.find((m) => m.id === selectedId)} onClose={() => setSelectedId(null)} />}</>}</AsyncPanel></>;
}
