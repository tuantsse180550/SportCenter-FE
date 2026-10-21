import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { ClassCard } from "../../components/member/MemberUI.jsx";
import { classService } from "../../services/index.js";
import { registrationApi } from "../../services/api/resources.js";
import { useApp } from "../../store/useApp.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
export function MemberClassesPage() {
 const navigate = useNavigate(); const { user, toast } = useApp(); const mutation = useMutation();
 const [search, setSearch] = useState(""); const [sport, setSport] = useState(""); const [sort, setSort] = useState("default");
 const query = useQuery(async () => { const [classes, registrations] = await Promise.all([classService.listClasses(), registrationApi.list()]); return { classes, registrations: registrations.filter(r => r.memberId === user.memberId) }; }, [user.memberId]);
 const register = item => { if (!window.confirm("Gửi yêu cầu đăng ký lớp " + item.name + "? Cần thanh toán để xác nhận đăng ký.")) return; mutation.run(() => classService.registerMember(item.id, user.memberId), registration => { toast("Trạng thái đăng ký: " + registration.status); navigate("/member/classes/" + item.id); }); };
 return <><PageHeader title="Khám phá lớp học" subtitle="Tìm bộ môn bạn yêu thích. Bắt đầu một thói quen khỏe mạnh." /><ErrorMessage error={mutation.error} /><AsyncPanel query={query}>{({ classes, registrations }) => {
 const categories = [...new Map(classes.filter(c => c.subjectId).map(c => [c.subjectId, c.sport || "Bộ môn chưa có tên"])).entries()];
 const rows = classes.filter(c => (!sport || c.subjectId === sport) && c.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
 if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "vi")); if (sort === "popular") rows.sort((a, b) => b.enrolledCount - a.enrolledCount);
 return <><Card className="member-catalog-filters"><label>Tìm lớp học<input type="search" placeholder="Nhập tên lớp học..." value={search} onChange={e => setSearch(e.target.value)} /></label><label>Bộ môn<select value={sport} onChange={e => setSport(e.target.value)}><option value="">Tất cả bộ môn</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Sắp xếp<select value={sort} onChange={e => setSort(e.target.value)}><option value="default">Thứ tự hiện có</option><option value="name">Tên lớp A–Z</option><option value="popular">Nhiều đăng ký đã xác nhận</option></select></label></Card>{!user.memberId && <p className="member-notice">Hoàn thiện hồ sơ trước khi đăng ký. <Button variant="ghost" onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button></p>}<p className="member-muted" role="status">{rows.length} lớp học phù hợp</p>{rows.length ? <div className="member-catalog">{rows.map(item => <ClassCard key={item.id} item={item} registration={registrations.find(r => r.classId === item.id)} onRegister={register} pending={mutation.pending} canRegister={Boolean(user.memberId)} />)}</div> : <Card><EmptyState title={classes.length ? "Không tìm thấy lớp học phù hợp" : "Chưa có lớp học"} text="Thử đổi tên tìm kiếm hoặc chọn một bộ môn khác." /></Card>}</>;
 }}</AsyncPanel></>;
}
