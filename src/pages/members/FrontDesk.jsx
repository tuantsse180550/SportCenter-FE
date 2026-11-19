import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { membersApi } from '../../api/members';
import { validEmail } from '../../utils/validation';
import MemberForm from '../../components/members/MemberForm';
import Field from '../../components/common/Field';
import Screen from '../../components/common/Screen';

/** Receptionist / manager: create login account + member profile in one step. */
export default function FrontDesk() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(input) {
    if (!validEmail(email)) throw new Error('Nhập email hợp lệ.');
    if (password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    setBusy(true);
    try { await membersApi.frontDesk(token, input, email, password); setPassword(''); }
    finally { setBusy(false); }
  }

  return (
    <Screen>
      <Link className="link" to="/members">← Hội viên</Link>
      <h1 className="title">Đăng ký hội viên tại quầy</h1>
      <p className="body">Tạo tài khoản đăng nhập và hồ sơ cho hội viên mới. Gửi email và mật khẩu ban đầu cho hội viên để họ tự đăng nhập.</p>
      <section className="card stack">
        <Field label="Email đăng nhập" type="email" autoComplete="off" value={email} onChangeText={setEmail} editable={!busy} />
        <Field label="Mật khẩu ban đầu (ít nhất 6 ký tự)" password autoComplete="new-password" value={password} onChangeText={setPassword} editable={!busy} />
      </section>
      <MemberForm submitLabel="Tạo tài khoản và hồ sơ" onSave={save} onSaved={() => navigate('/members')} />
    </Screen>
  );
}
