import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { classesApi, coachesApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { notificationsApi, ownNotifications } from '../../api/notifications';
import { FEEDBACK_TITLE, feedbackRecipients, isFeedback, sendFeedback, validateFeedback } from '../../api/feedback';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import ChoiceGroup from '../../components/common/ChoiceGroup';
import Field from '../../components/common/Field';
import ListPage from '../../components/common/ListPage';
import QueryStatus from '../../components/common/QueryStatus';
import Screen from '../../components/common/Screen';

/** Coach: feedback for a whole class or one confirmed student (sent as notifications). */
function CoachFeedback({ token }) {
  const load = useCallback(async () => {
    const [coach, classes, students] = await Promise.all([coachesApi.me(token), classesApi.list(token), coachesApi.myStudents(token)]);
    return { classes: classes.filter(item => referenceId(item.coachId) === entityId(coach)), students };
  }, [token]);
  const query = useApiQuery(load);
  const [classId, setClassId] = useState('');
  const [target, setTarget] = useState('class');
  const [memberId, setMemberId] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState([]);
  const pending = useRef(false);

  const classes = query.data?.classes || [];
  const selectedClass = classes.find(item => entityId(item) === classId);
  const classStudents = feedbackRecipients(query.data?.students || [], 'class', classId);

  async function send(event) {
    event.preventDefault();
    if (pending.current) return;
    const input = { target, classId, className: String(selectedClass?.name || ''), memberId, content, rating };
    const invalid = validateFeedback(input);
    if (invalid) { setError(invalid); return; }
    const recipients = feedbackRecipients(query.data?.students || [], target, classId, memberId);
    if (!recipients.length) { setError('Lớp chưa có học viên đã xác nhận để nhận nhận xét.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await sendFeedback(token, recipients, input);
      if (result.sent) {
        setSent(current => [{ title: `${target === 'class' ? 'Cả lớp' : recipients[0].fullName} · ${input.className}`, count: result.sent }, ...current].slice(0, 5));
        setContent(''); setRating(undefined);
      }
      if (result.failed.length) setError(`Chưa gửi được tới ${result.failed.map(item => item.fullName || item.memberId).join(', ')}. ${result.error}`);
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  return (
    <Screen>
      <Link className="link" to="/coach">← Tổng quan</Link>
      <p className="eyebrow">ĐỒNG HÀNH CÙNG HỌC VIÊN</p>
      <h1 className="title">Nhận xét học viên</h1>
      <p className="body">Nhận xét cả lớp hoặc từng học viên đã xác nhận. Học viên nhận thông báo trong ứng dụng và xem lại ở mục “Nhận xét từ HLV”.</p>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {query.data && (
        <form className="card stack" onSubmit={send} noValidate>
          {classes.length ? (
            <ChoiceGroup label="1. Lớp" options={classes.map(item => ({ value: entityId(item), label: `${String(item.name)} · ${referenceLabel(item.subjectId)}` }))}
              value={classId} onChange={value => { setClassId(value); setMemberId(''); setError(''); }} disabled={busy} />
          ) : <p className="body">Bạn chưa được phân công lớp.</p>}
          {selectedClass && (
            <>
              <ChoiceGroup label="2. Nhận xét cho" options={[{ value: 'class', label: `Cả lớp (${classStudents.length} học viên)` }, { value: 'member', label: 'Một học viên' }]}
                value={target} onChange={value => { setTarget(value); setMemberId(''); }} disabled={busy} />
              {target === 'member' && classStudents.length > 0 && (
                <ChoiceGroup label="Học viên" options={classStudents.map(item => ({ value: item.memberId, label: item.fullName || item.memberId }))} value={memberId} onChange={setMemberId} disabled={busy} />
              )}
              {!classStudents.length && <p className="body">Lớp chưa có học viên đã xác nhận.</p>}
              <Field label="3. Nội dung nhận xét" multiline value={content} onChangeText={setContent} editable={!busy} placeholder="Ví dụ: Cả lớp giữ nhịp tốt, cần chú ý khởi động kỹ hơn." />
              <div className="field">
                <span className="field-label">Đánh giá (tùy chọn)</span>
                <div className="chip-row">
                  {[1, 2, 3, 4, 5].map(value => <Button key={value} small secondary={rating !== value} disabled={busy} title={`${value}★`} onPress={() => setRating(rating === value ? undefined : value)} />)}
                </div>
              </div>
              {error && <p role="alert" className="error">{error}</p>}
              <div><Button type="submit" disabled={busy} title={busy ? 'Đang gửi…' : 'Gửi nhận xét'} /></div>
            </>
          )}
        </form>
      )}
      {sent.length > 0 && (
        <section className="card">
          <h2 className="heading">Đã gửi trong phiên này</h2>
          {sent.map((item, index) => <p key={index} className="body">✓ {item.title} · {item.count} học viên</p>)}
        </section>
      )}
    </Screen>
  );
}

/** Member: coach feedback received (own + class), filtered from notifications. */
function MemberFeedback({ token, userId }) {
  const load = useCallback(async () => ownNotifications(await notificationsApi.my(token), userId).filter(isFeedback), [token, userId]);
  const query = useApiQuery(load);
  return (
    <ListPage
      title="Nhận xét từ HLV"
      description="Nhận xét huấn luyện viên gửi cho cả lớp hoặc riêng bạn."
      items={query.data || []}
      loading={query.loading}
      error={query.error}
      reload={query.reload}
      empty="Chưa có nhận xét nào."
      renderItem={item => (
        <article className="card">
          <p className="eyebrow">{String(item.title || '').replace(`${FEEDBACK_TITLE} · `, '')}</p>
          <p className="body pre-line">{String(item.message || '')}</p>
          <p className="body small">{item.createdAt ? new Date(String(item.createdAt)).toLocaleString('vi-VN') : ''}</p>
        </article>
      )}
    />
  );
}

export default function Feedbacks() {
  const { user, token } = useAuth();
  if (user.role === 'COACH') return <CoachFeedback token={token} />;
  if (user.role === 'MEMBER') return <MemberFeedback token={token} userId={user.id} />;
  return <AccessScreen denied />;
}
