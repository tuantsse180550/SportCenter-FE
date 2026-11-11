import { useState } from "react";
import { Button, Card, Field } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { apiClient } from "../../api/apiClient.js";
import { authService } from "../../services/api/authApi.js";
import { useMutation } from "../../store/useQuery.js";
export function PasswordChangeForm() {
  const [currentPassword, setCurrent] = useState(""); const [newPassword, setNew] = useState(""); const [confirm, setConfirm] = useState(""); const mutation = useMutation();
  return <Card className="mt"><h2>Đổi mật khẩu</h2><p>Dành cho tài khoản đăng ký bằng email và mật khẩu. Với tài khoản Google, hãy đổi mật khẩu tại Google.</p><form onSubmit={event => { event.preventDefault(); mutation.run(() => apiClient("/api/auth/password", { method: "PUT", body: { currentPassword, newPassword } }), () => { authService.logout(); window.location.replace("/login"); }); }}><div className="form-grid"><Field required type="password" label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrent} /><Field required type="password" label="Mật khẩu mới (6–72 ký tự)" value={newPassword} onChange={setNew} /><Field required type="password" label="Nhập lại mật khẩu mới" value={confirm} onChange={setConfirm} /></div><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending || !currentPassword || newPassword.length < 6 || newPassword.length > 72 || newPassword !== confirm || currentPassword === newPassword}>Đổi mật khẩu và đăng nhập lại</Button></form></Card>;
}
