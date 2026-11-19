import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { homeworksApi } from '../../api/homeworks';
import { classesApi, coachesApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { studentMembers } from '../../utils/coach-teaching';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import ChoiceGroup from '../../components/common/ChoiceGroup';
import Field from '../../components/common/Field';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';

const targets = [{ value: 'class', label: 'Cả lớp' }, { value: 'member', label: 'Một học viên' }];

/** Coach assigns homework to a class or a student (BE also sends notifications). */
function HomeworkForm({ token, onSaved }) {
  const load = useCallback(async () => {
    const [coach, classes, students] = await Promise.all([coachesApi.me(token), classesApi.list(token), coachesApi.myStudents(token)]);
    return { classes: classes.filter(item => referenceId(item.coachId) === entityId(coach)), students };
  }, [token]);
  const query = useApiQuery(load);
  const [target, setTarget] = useState('class');
  const [targetId, setTargetId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const choices = target === 'class' ? query.data?.classes || [] : studentMembers(query.data?.students || []);

  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    setError(''); setMessage('');
    if (!choices.some(item => referenceId(item) === targetId) || !title.trim() || title.trim().length > 200 || !description.trim()) { setError('Chọn lớp/học viên, nhập tiêu đề tối đa 200 ký tự và nội dung bài tập.'); return; }
    const links = attachments.split('\n').map(value => value.trim()).filter(Boolean);
    if (links.some(value => { try { return !['https:', 'http:'].includes(new URL(value).protocol); } catch { return true; } })) { setError('Mỗi dòng đính kèm phải là một liên kết HTTP/HTTPS.'); return; }
    saving.current = true; setBusy(true);
    try {
      const result = await homeworksApi.create(token, { ...(target === 'class' ? { classId: targetId } : { memberId: targetId }), title: title.trim(), description: description.trim(), ...(dueDate ? { dueDate } : {}), attachments: links });
      setTitle(''); setDescription(''); setDueDate(''); setAttachments('');
      setMessage(`Đã giao bài tập cho ${result?.recipientCount ?? 0} học viên và gửi ${result?.notificationCount ?? 0} thông báo.`);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      saving.current = false; setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={save} noValidate>
      <h2 className="heading">Giao bài tập về nhà</h2>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      <ChoiceGroup label="Giao cho" options={targets} value={target} onChange={value => { setTarget(value); setTargetId(''); }} disabled={busy} />
      {choices.length > 0 && (
        <ChoiceGroup
          label={target === 'class' ? 'Lớp' : 'Học viên'}
          options={choices.map(item => ({ value: referenceId(item), label: referenceLabel(item) }))}
          value={targetId} onChange={setTargetId} disabled={busy}
        />
      )}
      {!query.loading && !choices.length && <p className="body">Chưa có lớp hoặc học viên đã xác nhận để chọn.</p>}
      <Field label="Tiêu đề" maxLength={200} value={title} onChangeText={setTitle} editable={!busy} />
      <Field label="Nội dung" multiline value={description} onChangeText={setDescription} editable={!busy} />
      <Field label="Hạn nộp (tùy chọn)" type="date" value={dueDate} onChangeText={setDueDate} editable={!busy} />
      <Field label="Liên kết đính kèm (mỗi dòng một URL, tùy chọn)" multiline value={attachments} onChangeText={setAttachments} editable={!busy} />
      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="success">{message}</p>}
      <div><Button type="submit" disabled={busy || query.loading || !!query.error} title={busy ? 'Đang giao…' : 'Giao bài tập và thông báo'} /></div>
    </form>
  );
}

export default function Homeworks() {
  const { token, user } = useAuth();
  const allowed = ['COACH', 'MEMBER'].includes(user.role);
  const load = useCallback(() => homeworksApi.my(token), [token]);
  const query = useApiQuery(load, allowed);
  if (!allowed) return <AccessScreen denied />;

  return (
    <Screen wide>
      <Link className="link" to={user.role === 'MEMBER' ? '/member' : '/coach'}>← Không gian của tôi</Link>
      <h1 className="title">{user.role === 'COACH' ? 'Bài tập về nhà' : 'Bài tập về nhà của tôi'}</h1>
      {user.role === 'COACH' && <HomeworkForm token={token} onSaved={query.reload} />}
      {user.role === 'COACH' && <h2 className="heading">Bài tập đã giao</h2>}
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {query.data?.length === 0 && <p className="body">Chưa có bài tập.</p>}
      <div className="card-grid">
        {query.data?.map(item => (
          <article key={entityId(item)} className="card">
            <h3 className="heading">{String(item.title || '')}</h3>
            <p className="body pre-line">{String(item.description || '')}</p>
            {item.classId && <p className="body">Lớp: {referenceLabel(item.classId)}</p>}
            {item.memberId && <p className="body">Học viên: {referenceLabel(item.memberId)}</p>}
            {item.dueDate && <p className="body">Hạn nộp: {new Date(String(item.dueDate)).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}</p>}
            {Array.isArray(item.attachments) && item.attachments.map(url => (
              <a key={url} className="link small break" href={String(url)} target="_blank" rel="noopener noreferrer">{String(url)}</a>
            ))}
          </article>
        ))}
      </div>
    </Screen>
  );
}
