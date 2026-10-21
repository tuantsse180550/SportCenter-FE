import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Field, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { memberService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useMutation } from "../../store/useQuery.js";
export function ReceptionistNewMemberPage() {
  const navigate = useNavigate(); const { toast } = useApp(); const mutation = useMutation(); const [form, setForm] = useState({ userId: "", fullName: "", phone: "", goal: "", level: "BEGINNER" }); const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return <><PageHeader title="Hồ sơ thành viên mới" subtitle="Sử dụng mã tài khoản thành viên đã có. Thành viên cần đăng ký tài khoản trước khi tạo hồ sơ." /><Card><div className="form-grid">{[["userId", "Mã tài khoản thành viên"], ["fullName", "Họ và tên"], ["phone", "Số điện thoại"], ["goal", "Mục tiêu"]].map(([key, label]) => <Field key={key} label={label} value={form[key]} onChange={(v) => update(key, v)} />)}<SelectField label="Trình độ" value={form.level} onChange={(v) => update("level", v)}>{["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((v) => <option key={v} value={v}>{uiLabel(v)}</option>)}</SelectField></div><p>Thao tác này không tạo gói hội viên hoặc giao dịch thanh toán.</p><ErrorMessage error={mutation.error} /><Button disabled={mutation.pending || !/^[a-f0-9]{24}$/i.test(form.userId) || !form.fullName.trim() || !form.phone.trim() || !form.goal.trim()} onClick={() => mutation.run(() => memberService.createMember(form), (member) => { toast("Đã tạo hồ sơ thành viên"); navigate("/receptionist/members/" + member.id); })}>{mutation.pending ? "Đang tạo..." : "Tạo hồ sơ thành viên"}</Button></Card></>;
}
