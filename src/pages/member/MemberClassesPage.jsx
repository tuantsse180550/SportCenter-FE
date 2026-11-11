import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { ClassCard, MemberRegistrationNotice } from "../../components/member/MemberUI.jsx";
import { classService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";

export function MemberClassesPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("");
  const [sort, setSort] = useState("default");
  const query = useQuery(() => classService.listMemberClasses());
  return <>
    <PageHeader title="Khám phá lớp học" subtitle="Tìm bộ môn bạn yêu thích. Bắt đầu một thói quen khỏe mạnh." />
    <MemberRegistrationNotice />
    <AsyncPanel query={query}>{classes => {
      const categories = [...new Map(classes.filter(c => c.subjectId).map(c => [c.subjectId, c.sport || "Bộ môn chưa có tên"])).entries()];
      const rows = classes.filter(c => (!sport || c.subjectId === sport) &&
        [c.name, c.course?.name || "", c.sport || "", c.coach?.name || ""].some(name => name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))));
      if (sort === "name") rows.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
      return <>
        <Card className="member-catalog-filters">
          <label>Tìm lớp hoặc khóa học<input type="search" placeholder="Nhập tên lớp, khóa học, bộ môn..." value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label>Bộ môn<select value={sport} onChange={e => setSport(e.target.value)}><option value="">Tất cả bộ môn</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Sắp xếp<select value={sort} onChange={e => setSort(e.target.value)}><option value="default">Thứ tự hiện có</option><option value="name">Tên lớp A–Z</option></select></label>
        </Card>
        {!user?.memberId && <p className="member-notice">Hoàn thiện hồ sơ trước khi đăng ký. <Button variant="ghost" onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button></p>}
        <p className="member-muted" role="status">{rows.length} lớp học phù hợp</p>
        {rows.length ? <div className="member-catalog">{rows.map(item => <ClassCard key={item.id} item={item} registrationKnown={false} />)}</div> :
          <Card><EmptyState title={classes.length ? "Không tìm thấy lớp học phù hợp" : "Chưa có lớp học"} text="Thử đổi tên tìm kiếm hoặc chọn một bộ môn khác." /></Card>}
      </>;
    }}</AsyncPanel>
  </>;
}
