import { useRef, useState } from 'react';
import Button from '../common/Button';
import Field from '../common/Field';
import ChoiceGroup from '../common/ChoiceGroup';
import { memberLevels } from '../../api/members';
import { validPhone } from '../../utils/validation';

/**
 * Member profile form (fullName, phone, goal, level).
 * onSave(input, userId) may throw; onSaved() runs after success.
 */
export default function MemberForm({ initial, requireUserId = false, requireGoal = true, onSave, onSaved, submitLabel = 'Lưu hồ sơ' }) {
  const [form, setForm] = useState({ fullName: initial?.fullName || '', phone: initial?.phone || '', goal: initial?.goal || '', level: initial?.level || 'BEGINNER' });
  const [userId, setUserId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const errors = {
    fullName: form.fullName.trim().length < 2 ? 'Nhập họ tên từ 2 ký tự.' : '',
    phone: !validPhone(form.phone) ? 'Nhập số điện thoại Việt Nam hợp lệ.' : '',
    goal: requireGoal && !form.goal.trim() ? 'Nhập mục tiêu tập luyện.' : '',
    userId: requireUserId && !/^[a-f\d]{24}$/i.test(userId.trim()) ? 'Nhập User ID gồm 24 ký tự của tài khoản MEMBER đã tồn tại.' : '',
  };
  const set = key => value => setForm(current => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (saving.current) return;
    setSubmitted(true); setError('');
    if (Object.values(errors).some(Boolean)) return;
    saving.current = true; setBusy(true);
    try { await onSave(form, userId); onSaved?.(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được hồ sơ.'); }
    finally { saving.current = false; setBusy(false); }
  }

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      {requireUserId && (
        <Field label="User ID của tài khoản hội viên" placeholder="24 ký tự" value={userId} onChangeText={setUserId} editable={!busy}
          error={submitted ? errors.userId : ''} hint="Hồ sơ gắn với tài khoản MEMBER đã đăng ký; không phải mã hồ sơ hội viên." />
      )}
      <Field label="Họ và tên" value={form.fullName} onChangeText={set('fullName')} editable={!busy} autoComplete="name" error={submitted ? errors.fullName : ''} />
      <Field label="Số điện thoại" type="tel" value={form.phone} onChangeText={set('phone')} editable={!busy} autoComplete="tel" error={submitted ? errors.phone : ''} />
      <Field label={requireGoal ? 'Mục tiêu tập luyện' : 'Mục tiêu tập luyện (tùy chọn)'} multiline value={form.goal} onChangeText={set('goal')} editable={!busy} error={submitted ? errors.goal : ''} />
      <ChoiceGroup label="Trình độ" options={memberLevels} value={form.level} onChange={set('level')} disabled={busy} />
      {error && <p role="alert" className="error">{error}</p>}
      <Button type="submit" disabled={busy} title={busy ? 'Đang lưu…' : submitLabel} />
    </form>
  );
}
