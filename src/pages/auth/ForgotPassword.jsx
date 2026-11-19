import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSent(false);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="title-lg">Quên mật khẩu?</h1>
      <p className="body">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
      <form className="stack" onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} required disabled={busy} />
        {sent && <p role="status" className="success">Nếu email đủ điều kiện, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.</p>}
        {error && <p role="alert" className="error">{error}</p>}
        <Button type="submit" disabled={busy || sent}>{busy ? 'Đang xử lý…' : 'Gửi liên kết'}</Button>
      </form>
      <Link to="/login" className="link">Quay lại đăng nhập</Link>
    </AuthLayout>
  );
}
