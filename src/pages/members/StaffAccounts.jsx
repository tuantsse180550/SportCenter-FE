import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../api/staff';
import { validEmail, validPhone } from '../../utils/validation';
import { workspacePath } from '../../utils/url';
import Button from '../../components/common/Button';
import ChoiceGroup from '../../components/common/ChoiceGroup';
import Field from '../../components/common/Field';
import RelationField from '../../components/common/RelationField';
import Screen from '../../components/common/Screen';

const roleOptions = [{ value: 'COACH', label: 'Huấn luyện viên' }, { value: 'RECEPTIONIST', label: 'Lễ tân' }];
const empty = { email: '', password: '', role: 'COACH', fullName: '', phone: '', subjectId: '' };

/** CENTER_MANAGER grants system access: creates COACH / RECEPTIONIST accounts. */
export default function StaffAccounts() {
  const { token } = useAuth();
  const [form, setForm] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const pending = useRef(false);
  const set = key => value => setForm(current => ({ ...current, [key]: value }));
  const errors = {
    email: !validEmail(form.email) ? 'Nhập email hợp lệ.' : '',
    password: form.password.length < 6 ? 'Mật khẩu cần ít nhất 6 ký tự.' : '',
    fullName: form.fullName.trim().length < 2 ? 'Nhập họ tên từ 2 ký tự.' : '',
    phone: !validPhone(form.phone) ? 'Nhập số điện thoại Việt Nam hợp lệ.' : '',
    // BE requires a subject for COACH (Coach.subjectId is required).
    subjectId: form.role === 'COACH' && !form.subjectId ? 'Chọn môn thể thao huấn luyện viên phụ trách.' : '',
  };

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    setSubmitted(true); setError(''); setCreated(null);
    if (Object.values(errors).some(Boolean)) return;
    pending.current = true; setBusy(true);
    try {
      await staffApi.createAccount(token, form);
      setCreated({ email: form.email.trim().toLowerCase(), role: form.role });
      setForm(empty); setSubmitted(false);
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  return (
    <Screen>
      <Link className="link" to="/manager">← Tổng quan</Link>
      <p className="eyebrow">PHÂN QUYỀN TRUY CẬP</p>
      <h1 className="title">Tạo tài khoản nhân viên</h1>
      <p className="body">Tài khoản huấn luyện viên được tạo kèm hồ sơ HLV, có thể phân công vào lớp ngay. Hội viên tự đăng ký hoặc được lễ tân tạo tại quầy.</p>
      {created && (
        <p role="status" className="success">
          Đã tạo tài khoản {created.role === 'COACH' ? 'huấn luyện viên' : 'lễ tân'} {created.email}.{' '}
          {created.role === 'COACH' && <Link className="link" to={workspacePath('coaches')}>Xem danh sách HLV →</Link>}
        </p>
      )}
      <form className="card stack" onSubmit={submit} noValidate>
        <ChoiceGroup label="Vai trò" options={roleOptions} value={form.role} onChange={set('role')} disabled={busy} />
        <Field label="Email đăng nhập" type="email" autoComplete="off" value={form.email} onChangeText={set('email')} editable={!busy} error={submitted ? errors.email : ''} />
        <Field label="Mật khẩu ban đầu" password autoComplete="new-password" value={form.password} onChangeText={set('password')} editable={!busy} error={submitted ? errors.password : ''} />
        <Field label="Họ và tên" value={form.fullName} onChangeText={set('fullName')} editable={!busy} error={submitted ? errors.fullName : ''} />
        <Field label="Số điện thoại" type="tel" value={form.phone} onChangeText={set('phone')} editable={!busy} error={submitted ? errors.phone : ''} />
        {form.role === 'COACH' && <RelationField label="Môn thể thao phụ trách" path="/api/subjects" token={token} value={form.subjectId} onChange={set('subjectId')} disabled={busy} error={submitted ? errors.subjectId : ''} />}
        {error && <p role="alert" className="error">{error}</p>}
        <Button type="submit" disabled={busy} title={busy ? 'Đang tạo…' : 'Tạo tài khoản'} />
      </form>
    </Screen>
  );
}
