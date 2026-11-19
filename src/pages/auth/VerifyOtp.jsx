import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import { roleHome } from '../../utils/staff-navigation';

const formatSeconds = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Step 2 of Google sign-in when the BE asks for an email OTP. */
export default function VerifyOtp() {
  const navigate = useNavigate();
  const { user, pendingOtp, verifyGoogleOtp, resendGoogleOtp, cancelGoogleOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (user) return <Navigate to={roleHome(user.role)} replace />;
  if (!pendingOtp) {
    return (
      <AuthLayout>
        <h1 className="title">Bắt đầu lại với Google</h1>
        <p className="body">Phiên xác minh chỉ được giữ trong trang hiện tại. Vui lòng đăng nhập Google để nhận mã mới.</p>
        <Button onClick={() => navigate('/login', { replace: true })}>Về đăng nhập</Button>
      </AuthLayout>
    );
  }

  const wait = Math.max(0, Math.ceil((pendingOtp.resendAt - now) / 1000));
  const expires = Math.max(0, Math.ceil((pendingOtp.expiresAt - now) / 1000));

  async function verify(event) {
    event.preventDefault();
    if (pending.current) return;
    setError(''); setMessage('');
    if (!/^\d{6}$/.test(otp)) { setError('Vui lòng nhập đủ 6 chữ số trong email.'); return; }
    pending.current = true; setBusy(true);
    try {
      const signedIn = await verifyGoogleOtp(otp);
      navigate(roleHome(signedIn.role), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  async function resend() {
    if (pending.current || wait > 0) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const next = await resendGoogleOtp();
      if (next.status === 'authenticated') navigate(roleHome(next.user.role), { replace: true });
      else { setOtp(''); setNow(Date.now()); setMessage('Đã gửi mã mới. Vui lòng kiểm tra hộp thư và thư rác.'); }
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="otp-icon" aria-hidden="true">✉</div>
      <div className="stack-sm">
        <p className="eyebrow">XÁC MINH TÀI KHOẢN GOOGLE</p>
        <h1 className="title">Kiểm tra hộp thư của bạn</h1>
        <p className="body">Nhập mã 6 số được gửi tới <strong>{pendingOtp.email}</strong> để hoàn tất đăng nhập.</p>
      </div>
      <form className="stack" onSubmit={verify} noValidate>
        <Field
          label="Mã xác minh" placeholder="000000" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
          value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={busy}
        />
        <p className={expires ? 'body small' : 'error'}>
          {expires ? `Mã còn hiệu lực ${formatSeconds(expires)}` : 'Mã đã hết hạn. Gửi lại để nhận mã mới.'}
        </p>
        {error && <p role="alert" className="error">{error}</p>}
        {message && <p role="status" className="success">{message}</p>}
        <Button type="submit" disabled={busy || !expires}>{busy ? 'Đang xử lý…' : 'Xác minh & tiếp tục →'}</Button>
      </form>
      <Button secondary disabled={busy || wait > 0} onClick={resend}>{wait ? `Gửi lại mã sau ${wait}s` : 'Gửi lại mã xác minh'}</Button>
      <Button secondary disabled={busy} onClick={() => { cancelGoogleOtp(); navigate('/login', { replace: true }); }}>Dùng tài khoản khác</Button>
      <p className="body small">OTP được gửi bởi SportCenter để xác minh tài khoản Google. Không chia sẻ mã này với người khác.</p>
    </AuthLayout>
  );
}
