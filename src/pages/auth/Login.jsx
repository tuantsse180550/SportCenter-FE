import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import { validEmail } from '../../utils/validation';
import { roleHome } from '../../utils/staff-navigation';

export default function Login() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, login, sessionMessage } = useAuth();
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const emailError = submitted && !validEmail(email) ? 'Vui lòng nhập email hợp lệ.' : '';
  const passwordError = submitted && password.length < 6 ? 'Mật khẩu cần ít nhất 6 ký tự.' : '';

  // Signed in (just now, or reload on /login): go back to the page that asked for login.
  if (user) return <Navigate to={location.state?.from || roleHome(user.role)} replace />;

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    setSubmitted(true);
    setError('');
    if (!validEmail(email) || password.length < 6) return;
    pending.current = true;
    setBusy(true);
    try {
      await login(email, password); // the `if (user)` redirect above takes over
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const locked = busy;
  return (
    <AuthLayout>
      <div className="stack-sm">
        <p className="eyebrow">VUI VÌ BẠN ĐÃ QUAY LẠI</p>
        <h1 className="title-lg">Chào mừng trở lại</h1>
        <p className="body">Đăng nhập để tiếp tục với ActiveHub.</p>
      </div>
      {params.get('registered') === '1' && <p className="success">Tạo tài khoản thành công! Đăng nhập để bắt đầu tập luyện.</p>}
      {params.get('reset') === '1' && <p role="status" className="success">Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</p>}
      {sessionMessage && <p role="alert" className="error">{sessionMessage}</p>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Email" type="email" placeholder="name@center.vn" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={locked} error={emailError} />
        <Field label="Mật khẩu" password placeholder="Nhập mật khẩu" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={locked} error={passwordError} />
        <Link to="/forgot-password" className="link align-right">Quên mật khẩu?</Link>
        {error && <p role="alert" className="error">{error}</p>}
        <Button type="submit" disabled={locked}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập →'}</Button>
      </form>
      <p className="body center">Chưa có tài khoản? <Link to="/register" className="link">Đăng ký ngay</Link></p>
    </AuthLayout>
  );
}
