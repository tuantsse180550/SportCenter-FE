import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Field, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { memberProfileApi } from "../../services/api/resources.js";
import { useApp } from "../../store/useApp.js";
import { useMutation } from "../../store/useQuery.js";
import { uiLabel } from "../../utils/vietnamese.js";
export function ReceptionistNewMemberPage() {
  const navigate = useNavigate(); const { toast } = useApp(); const mutation = useMutation();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "", goal: "", level: "BEGINNER" });
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  return <><PageHeader title="Đăng ký thành viên tại quầy" subtitle="Tạo tài khoản thành viên và hồ sơ tập luyện trong cùng một thao tác." /><Card><form onSubmit={event => { event.preventDefault(); mutation.run(() => memberProfileApi.frontDesk(form), member => { toast("Đã tạo tài khoản thành viên"); navigate("/receptionist/members/" + member.id); }); }}><div className="form-grid">{[["email", "Email", "email"], ["password", "Mật khẩu ban đầu (ít nhất 6 ký tự)", "password"], ["fullName", "Họ và tên", "text"], ["phone", "Số điện thoại", "tel"], ["goal", "Mục tiêu tập luyện", "text"]].map(([key, label, type]) => <Field required key={key} label={label} type={type} value={form[key]} onChange={value => update(key, value)} />)}<SelectField label="Trình độ" value={form.level} onChange={value => update("level", value)}>{["BEGINNER", "INTERMEDIATE", "ADVANCED"].map(value => <option key={value} value={value}>{uiLabel(value)}</option>)}</SelectField></div><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending || form.password.length < 6 || !form.fullName.trim() || !form.phone.trim() || !form.goal.trim()}>{mutation.pending ? "Đang tạo..." : "Tạo tài khoản thành viên"}</Button></form></Card></>;
}
