import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';

export default function ResetPassword() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get('token');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      logout();
      navigate('/login?reset=1', { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="title-lg">Đặt lại mật khẩu</h1>
      {/^[a-f0-9]{64}$/.test(token || '') ? (
        <form className="stack" onSubmit={submit}>
          <Field label="Mật khẩu mới" password value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required disabled={busy} />
          <Field label="Xác nhận mật khẩu mới" password value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required disabled={busy} />
          {error && <p role="alert" className="error">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</Button>
        </form>
      ) : <p role="alert" className="error">Liên kết đặt lại mật khẩu không hợp lệ.</p>}
      <Link to="/forgot-password" className="link">Yêu cầu liên kết mới</Link>
    </AuthLayout>
  );
}
