import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthVisual } from "../../components/common/AuthVisual.jsx";
import { Badge, Button, Field } from "../../components/common/UI.jsx";
import { ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { authService } from "../../services/index.js";
import { useMutation } from "../../store/useQuery.js";
export function RegisterPage() {
  const navigate = useNavigate(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [created, setCreated] = useState(null); const mutation = useMutation();
  const submit = (event) => { event.preventDefault(); mutation.run(() => authService.registerMember({ email, password }), (user) => { setCreated(user); setPassword(""); }); };
  return <section className="auth-layout"><form className="auth-card" onSubmit={submit}><Badge>ĐĂNG KÝ</Badge><h1>Tạo tài khoản thành viên</h1><p>Sau khi đăng ký tài khoản, bạn cần được lễ tân tạo hồ sơ thành viên trước khi đăng ký lớp học.</p>{created ? <div className="success-box">Đã tạo tài khoản. Vui lòng cung cấp mã tài khoản sau cho lễ tân: <strong>{created.id}</strong></div> : <><Field required label="Email" type="email" value={email} onChange={setEmail} /><Field required label="Mật khẩu (ít nhất 6 ký tự)" type="password" value={password} onChange={setPassword} /><Button type="submit" disabled={mutation.pending || password.length < 6} className="full">{mutation.pending ? "Đang đăng ký..." : "Đăng ký"}</Button></>}<ErrorMessage error={mutation.error} /><button className="btn back" type="button" onClick={() => navigate("/login")}><span aria-hidden="true">←</span>Quay lại đăng nhập</button></form><AuthVisual /></section>;
}
