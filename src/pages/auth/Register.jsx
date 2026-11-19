import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import { passwordStrength, validEmail } from '../../utils/validation';
import { authApi } from '../../api';

const fields = [
  { key: 'email', label: 'Email', type: 'email', placeholder: 'name@email.com', autoComplete: 'email' },
  { key: 'password', label: 'Mật khẩu', password: true, placeholder: 'Tối thiểu 6 ký tự', autoComplete: 'new-password' },
  { key: 'confirm', label: 'Xác nhận mật khẩu', password: true, placeholder: 'Nhập lại mật khẩu', autoComplete: 'new-password' },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const errors = {
    email: !validEmail(form.email) ? 'Email chưa hợp lệ.' : '',
    password: form.password.length < 6 ? 'Mật khẩu cần ít nhất 6 ký tự.' : '',
    confirm: !form.confirm || form.password !== form.confirm ? 'Mật khẩu xác nhận không khớp.' : '',
  };
  const strength = passwordStrength(form.password);
  const score = strength === 'Mạnh' ? 3 : strength === 'Trung bình' ? 2 : 1;

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    setSubmitted(true);
    setError('');
    if (Object.values(errors).some(Boolean) || !agreed) return;
    pending.current = true;
    setBusy(true);
    try {
      await register(form.email, form.password);
      setEmail(form.email.trim());
      setOtp('');
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    if (pending.current || !/^\d{6}$/.test(otp)) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await authApi.verifyRegistration(email, otp);
      navigate(`/login?email=${encodeURIComponent(email)}&registered=1`, { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (email) return (
    <AuthLayout>
      <h1 className="title-lg">Xác nhận email</h1>
      <p className="body">Nhập mã gồm 6 chữ số đã gửi tới <strong>{email}</strong>. Mã có hiệu lực trong 5 phút.</p>
      <form className="stack" onSubmit={verify}>
        <Field label="Mã OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" disabled={busy} />
        {error && <p role="alert" className="error">{error}</p>}
        <Button type="submit" disabled={busy || otp.length !== 6}>{busy ? 'Đang xác nhận…' : 'Xác nhận đăng ký'}</Button>
        <Button type="button" disabled={busy} onClick={submit}>Gửi lại mã</Button>
        <Button type="button" disabled={busy} onClick={() => { setEmail(''); setError(''); }}>Đổi email</Button>
      </form>
    </AuthLayout>
  );

  const locked = busy;
  return (
    <AuthLayout>
      <div className="stack-sm">
        <p className="eyebrow">HÀNH TRÌNH CỦA BẠN BẮT ĐẦU TỪ ĐÂY</p>
        <h1 className="title-lg">Tạo tài khoản hội viên</h1>
        <p className="body">Bắt đầu hành trình cùng ActiveHub.</p>
      </div>
      <form className="stack" onSubmit={submit} noValidate>
        {fields.map(({ key, ...field }) => (
          <Field
            key={key}
            {...field}
            value={form[key]}
            onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))}
            disabled={locked}
            error={submitted ? errors[key] : ''}
          />
        ))}
        {form.password && (
          <div className="stack-xs">
            <div className="strength">
              {[1, 2, 3].map(index => <span key={index} className={index <= score ? `on level-${score}` : ''} />)}
            </div>
            <p className="body small">Độ mạnh: {strength}</p>
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={locked} />
          <span>Tôi đồng ý với điều khoản và chính sách quyền riêng tư.</span>
        </label>
        <Link to="/terms" className="link">Đọc điều khoản sử dụng →</Link>
        {submitted && !agreed && <p className="error">Vui lòng đồng ý với điều khoản để tiếp tục.</p>}
        {error && <p role="alert" className="error">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Đang gửi mã…' : 'Gửi mã xác nhận'}
        </Button>
      </form>
      <p className="body center">Đã có tài khoản? <Link to="/login" className="link">Đăng nhập</Link></p>
      <p className="body small">Bạn có thể bổ sung hồ sơ tập luyện sau khi đăng nhập.</p>
    </AuthLayout>
  );
}
