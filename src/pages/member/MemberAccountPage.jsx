import { useState } from "react";
import { Button, Card, Field, InfoGrid, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { StatusBadge } from "../../components/member/MemberUI.jsx";
import { authService, memberService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { uiLabel } from "../../utils/vietnamese.js";
function ProfileForm({ profile, onSaved, onCancel }) {
 const [form, setForm] = useState({ fullName: profile?.fullName || "", phone: profile?.phone || "", goal: profile?.goal || "", level: profile?.level || "BEGINNER" });
 const mutation = useMutation(); const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
 const submit = e => { e.preventDefault(); mutation.run(async () => { const saved = profile ? await memberService.updateProfile(profile.id, form) : await memberService.createMyProfile(form); return saved; }, onSaved); };
 return <form className="member-profile-form" onSubmit={submit}><h2>{profile ? "Chỉnh sửa hồ sơ" : "Hoàn thiện hồ sơ"}</h2><div className="form-grid"><Field required label="Họ và tên" value={form.fullName} onChange={v => update("fullName", v)} /><Field required label="Số điện thoại" type="tel" value={form.phone} onChange={v => update("phone", v)} /><Field required label="Mục tiêu tập luyện" value={form.goal} onChange={v => update("goal", v)} /><SelectField label="Trình độ" value={form.level} onChange={v => update("level", v)}>{["BEGINNER", "INTERMEDIATE", "ADVANCED"].map(v => <option key={v} value={v}>{uiLabel(v)}</option>)}</SelectField></div><ErrorMessage error={mutation.error} /><div className="member-card-actions"><Button type="submit" disabled={mutation.pending || !form.fullName.trim() || !form.phone.trim() || !form.goal.trim()}>{mutation.pending ? "Đang lưu..." : "Lưu hồ sơ"}</Button>{profile && <Button variant="secondary" disabled={mutation.pending} onClick={onCancel}>Hủy</Button>}</div></form>;
}
export function MemberAccountPage() {
 const { user, setUser, toast } = useApp(); const [editing, setEditing] = useState(false); const [refreshError, setRefreshError] = useState(null);
 const query = useQuery(() => memberService.getMyProfile());
 const saved = profile => { setEditing(false); setUser({ ...user, name: profile.fullName, memberId: profile.id }); toast("Đã lưu hồ sơ cá nhân"); query.reload(); authService.restore().then(restored => { if (restored) setUser(restored); }, setRefreshError); };
 return <><PageHeader title="Tài khoản của tôi" subtitle="Thông tin cá nhân và mục tiêu cho hành trình tập luyện." /><ErrorMessage error={refreshError} /><AsyncPanel query={query}>{profile => <div className="member-profile-grid"><Card className="member-profile-summary"><span className="member-profile-avatar">{(profile?.fullName || user.email).slice(0,1).toLocaleUpperCase("vi")}</span><h2>{profile?.fullName || "Hồ sơ của bạn"}</h2><p>{user.email}</p><StatusBadge status={user.status} /><p className="member-muted">Thành viên Sport Center</p></Card><Card>{editing || !profile ? <ProfileForm profile={profile} onSaved={saved} onCancel={() => setEditing(false)} /> : <><div className="member-section-heading"><h2>Hồ sơ tập luyện</h2><Button variant="secondary" onClick={() => setEditing(true)}>Chỉnh sửa hồ sơ</Button></div><InfoGrid items={[["Họ tên", profile.fullName], ["Số điện thoại", profile.phone], ["Mục tiêu", profile.goal], ["Trình độ", profile.level]]} /></>}</Card></div>}</AsyncPanel></>;
}
