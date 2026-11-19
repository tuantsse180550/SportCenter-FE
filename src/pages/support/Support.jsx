import { useCallback, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActorProfile } from '../../hooks/useActorProfile';
import { useApiQuery } from '../../hooks/useApiQuery';
import { supportApi, canResolveSupport, ownSupport, supportResponder, supportSource } from '../../api/support';
import { entityId, referenceLabel } from '../../api/operations';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import ListPage from '../../components/common/ListPage';
import QueryStatus from '../../components/common/QueryStatus';
import RelationField from '../../components/common/RelationField';

const filters = [['PENDING', 'Chờ xử lý'], ['RESOLVED', 'Đã giải quyết'], ['ALL', 'Tất cả']];
const when = value => (value ? new Date(String(value)).toLocaleString('vi-VN') : '');

/** The center's answer, shown to both the member and staff. */
function SupportAnswer({ item }) {
  if (!item.response) return null;
  return (
    <div className="support-answer">
      <p className="heading-sm">Phản hồi từ {supportResponder(item)}{item.respondedAt ? ` · ${when(item.respondedAt)}` : ''}</p>
      <p className="body pre-line">{String(item.response)}</p>
    </div>
  );
}

/** Staff: write the answer, then send it (keeps the request open) or send and close. */
function SupportReply({ item, busy, onReply, onReopen }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const resolved = item.status === 'RESOLVED';
  function send(close) {
    if (!draft.trim() && !close) { setError('Nhập nội dung phản hồi.'); return; }
    if (draft.trim().length > 2000) { setError('Phản hồi tối đa 2000 ký tự.'); return; }
    setError('');
    onReply(draft, close, () => setDraft(''));
  }
  if (resolved) {
    return <div><Button secondary small disabled={busy} title="Mở lại yêu cầu" onPress={onReopen} /></div>;
  }
  return (
    <div className="support-reply">
      <Field label="Phản hồi cho hội viên" multiline rows={3} value={draft} onChangeText={value => { setDraft(value); setError(''); }} editable={!busy}
        placeholder="Ví dụ: Trung tâm đã đổi bạn sang lớp tối thứ 3, bắt đầu từ 18/11." error={error} />
      <div className="chip-row">
        <Button small disabled={busy || !draft.trim()} title="Gửi phản hồi và đóng" onPress={() => send(true)} />
        <Button small secondary disabled={busy || !draft.trim()} title="Gửi phản hồi" onPress={() => send(false)} />
        <Button small secondary disabled={busy} title="Đóng không cần phản hồi" onPress={() => onReply('', true, () => setDraft(''))} />
      </div>
    </div>
  );
}

/** Members send requests and read the center's answers; receptionist/manager answer and close them. */
export default function Support() {
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const staff = canResolveSupport(user.role);
  const actor = useActorProfile(member);
  const actorId = actor.data ? entityId(actor.data) : '';
  const [params] = useSearchParams();
  // Opened from a session page (?topic=…): start the request with that session named.
  const [message, setMessage] = useState(() => (params.get('topic') ? `Về ${params.get('topic')}: ` : ''));
  const [forMember, setForMember] = useState('');
  // Staff work the open requests first; members see everything they sent.
  const [filter, setFilter] = useState(staff ? 'PENDING' : 'ALL');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const load = useCallback(async () => {
    const items = await supportApi.list(token);
    return member ? ownSupport(items, actorId) : items;
  }, [token, member, actorId]);
  const query = useApiQuery(load, staff || (member && !!actorId));

  if (!member && !staff) return <AccessScreen denied />;

  async function run(action) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); query.reload(); }
    catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    const memberId = member ? actorId : forMember;
    if (!memberId) { setError('Chọn hội viên cần hỗ trợ.'); return; }
    if (!message.trim()) { setError('Nhập nội dung cần hỗ trợ.'); return; }
    run(async () => { await supportApi.create(token, memberId, message); setMessage(''); setForMember(''); setShowForm(false); });
  }

  const all = query.data || [];
  const count = status => all.filter(item => status === 'ALL' || item.status === status).length;
  const form = (
    <form className="card stack" onSubmit={submit} noValidate>
      <h2 className="heading">{member ? 'Bạn cần hỗ trợ gì?' : 'Ghi nhận yêu cầu tại quầy'}</h2>
      {staff && <p className="body small">Dùng khi hội viên đến quầy hoặc gọi điện. Để trả lời một yêu cầu, dùng ô phản hồi ngay trong yêu cầu đó.</p>}
      {staff && <RelationField label="Hội viên" path="/api/members" token={token} value={forMember} onChange={setForMember} disabled={busy} />}
      <Field label="Nội dung yêu cầu" multiline value={message} onChangeText={setMessage} editable={!busy} />
      <div className="chip-row">
        <Button type="submit" disabled={busy || (member && !actorId)} title={busy ? 'Đang gửi…' : member ? 'Gửi yêu cầu' : 'Ghi nhận yêu cầu'} />
        {staff && <Button secondary disabled={busy} title="Hủy" onPress={() => setShowForm(false)} />}
      </div>
    </form>
  );

  return (
    <ListPage
      title={member ? 'Trung tâm hỗ trợ' : 'Yêu cầu hỗ trợ'}
      description={member ? 'Gửi yêu cầu đổi lịch, hỏi thông tin lớp học; câu trả lời của trung tâm hiện ngay dưới yêu cầu.' : 'Trả lời yêu cầu của hội viên rồi đóng lại; hội viên nhận câu trả lời kèm thông báo.'}
      items={all.filter(item => filter === 'ALL' || item.status === filter)}
      loading={query.loading || (member && actor.loading)}
      error={query.error}
      reload={query.reload}
      controls={(
        <div className="stack">
          {member && <QueryStatus loading={actor.loading} error={actor.error} retry={actor.reload} />}
          {member && (actor.error ? <Link className="link" to="/profile">Hoàn thiện hồ sơ hội viên →</Link> : form)}
          <div className="chip-row">
            {filters.map(([value, label]) => <Button key={value} small secondary={value !== filter} title={`${label}${query.data ? ` (${count(value)})` : ''}`} onPress={() => setFilter(value)} />)}
            {staff && !showForm && <Button small secondary title="+ Ghi nhận yêu cầu tại quầy" onPress={() => setShowForm(true)} />}
          </div>
          {staff && showForm && form}
          {error && <p role="alert" className="error">{error}</p>}
        </div>
      )}
      renderItem={item => (
        <article className="card">
          <span className={`badge status-${item.status}`}>{item.status === 'RESOLVED' ? '✓ Đã giải quyết' : '◷ Chờ xử lý'}</span>
          {staff && <h2 className="heading-sm">{referenceLabel(item.memberId)}</h2>}
          <p className="body pre-line">{String(item.message || '')}</p>
          <p className="body small">{[when(item.createdAt), staff ? supportSource(item) : ''].filter(Boolean).join(' · ')}</p>
          <SupportAnswer item={item} />
          {member && item.status === 'PENDING' && !item.response && <p className="body small">Trung tâm sẽ trả lời tại đây và gửi thông báo cho bạn.</p>}
          {staff && (
            <SupportReply
              item={item}
              busy={busy}
              onReply={(response, close, done) => run(async () => {
                await (response.trim() ? supportApi.reply(token, entityId(item), response, close) : supportApi.updateStatus(token, entityId(item), 'RESOLVED'));
                done();
              })}
              onReopen={() => run(() => supportApi.updateStatus(token, entityId(item), 'PENDING'))}
            />
          )}
        </article>
      )}
    />
  );
}
