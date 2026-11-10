import { useState } from "react";
import { Button, Modal, SelectField } from "../common/UI.jsx";
import { useMutation } from "../../store/useQuery.js";
import { coachApi } from "../../services/api/resources.js";

function errorText(error) {
  if (error.status === 409) return "Email này đã có tài khoản. Vui lòng dùng email khác.";
  if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error.status === 403) return "Chỉ quản lý trung tâm được cấp tài khoản HLV.";
  if (error.status === 404) return "Bộ môn không còn tồn tại. Vui lòng tải lại danh sách bộ môn.";
  if (error.status === 400) return "Thông tin chưa hợp lệ. Kiểm tra email, mật khẩu, họ tên, điện thoại và chuyên môn.";
  return "Chưa xác nhận được kết quả cấp tài khoản. Vui lòng đóng form và kiểm tra danh sách HLV trước khi thử lại.";
}

export function CreateCoachAccountModal({ subjects, onClose, onDone }) {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", confirmPassword: "", subjectId: "" });
  const [validation, setValidation] = useState("");
  const mutation = useMutation();
  const set = key => value => setForm(old => ({ ...old, [key]: value }));
  const submit = event => {
    event.preventDefault();
    setValidation("");
    if (form.password !== form.confirmPassword) { setValidation("Mật khẩu nhập lại chưa khớp."); return; }
    if (!form.password.trim() || form.password.length < 6 || new TextEncoder().encode(form.password).length > 72) {
      setValidation("Mật khẩu cần ít nhất 6 ký tự và không quá 72 byte UTF-8."); return;
    }
    if (!form.fullName.trim() || !form.phone.trim() || !subjects.some(subject => subject.id === form.subjectId)) {
      setValidation("Vui lòng nhập họ tên, điện thoại và chọn một chuyên môn."); return;
    }
    mutation.run(() => coachApi.createAccount({
      fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim().toLowerCase(),
      password: form.password, subjectIds: [form.subjectId],
    }), result => {
      setForm(old => ({ ...old, password: "", confirmPassword: "" }));
      onDone(result);
    });
  };
  return <Modal title="Cấp tài khoản huấn luyện viên" onClose={mutation.pending ? () => {} : onClose}>
    <p>Tạo tài khoản đăng nhập, hồ sơ và một chuyên môn cho HLV. Quản lý cung cấp email và mật khẩu ban đầu cho HLV sau khi tạo thành công.</p>
    <form className="form-grid" onSubmit={submit}>
      {[
        ["fullName", "Họ tên", "text", "name"], ["phone", "Số điện thoại", "tel", "tel"],
        ["email", "Email đăng nhập", "email", "off"], ["password", "Mật khẩu ban đầu", "password", "new-password"],
        ["confirmPassword", "Nhập lại mật khẩu", "password", "new-password"],
      ].map(([key, label, type, autoComplete]) => <label key={key} className="field"><span>{label}</span>
        <input required disabled={mutation.pending} type={type} autoComplete={autoComplete} value={form[key]} onChange={event => set(key)(event.target.value)} />
      </label>)}
      <SelectField label="Chuyên môn" disabled={mutation.pending} value={form.subjectId} onChange={set("subjectId")}>
        <option value="">Chọn một bộ môn</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
      </SelectField>
      {!subjects.length && <p role="alert">Chưa có bộ môn để chọn chuyên môn. Vui lòng bổ sung bộ môn trước.</p>}
      {(validation || mutation.error) && <p className="form-error" role="alert">{validation || errorText(mutation.error)}</p>}
      <div className="class-actions">
        <Button disabled={mutation.pending} variant="secondary" onClick={onClose}>Hủy</Button>
        <Button type="submit" disabled={mutation.pending || !form.subjectId || !subjects.length}>{mutation.pending ? "Đang cấp tài khoản..." : "Cấp tài khoản HLV"}</Button>
      </div>
    </form>
  </Modal>;
}
