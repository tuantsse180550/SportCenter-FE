import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthVisual } from "../../components/common/AuthVisual.jsx";
import { Badge, Button, Field, LoadingScreen } from "../../components/common/UI.jsx";
import { ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { authService, roleHomePath } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useMutation } from "../../store/useQuery.js";
export function LoginPage() {
  const navigate = useNavigate(); const { user, setUser, authLoading } = useApp();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const mutation = useMutation();
  if (authLoading) return <LoadingScreen />;
  if (user) return <Navigate to={roleHomePath[user.role]} replace />;
  const submit = (event) => { event.preventDefault(); mutation.run(() => authService.login({ email, password }), ({ user: signedIn }) => { setPassword(""); setUser(signedIn); navigate(roleHomePath[signedIn.role], { replace: true }); }); };
  return <section className="auth-layout"><form className="auth-card" onSubmit={submit}><Badge>ĐĂNG NHẬP</Badge><h1>Chào mừng bạn trở lại</h1><p>Đăng nhập bằng tài khoản Sport Center của bạn.</p><Field required label="Email" type="email" value={email} onChange={setEmail} /><Field required label="Mật khẩu" type="password" value={password} onChange={setPassword} /><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending} className="full">{mutation.pending ? "Đang đăng nhập..." : "Đăng nhập"}</Button><button type="button" className="text-link" onClick={() => navigate("/forgot-password")}>Quên mật khẩu?</button></form><AuthVisual /></section>;
}
