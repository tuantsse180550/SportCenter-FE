import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { managerApi } from '../../api/manager';
import { membersApi, memberId } from '../../api/members';
import { currency } from '../../api/payments';
import { entityId } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import Field from '../../components/common/Field';
import { Icon } from '../../components/common/Icon';
import Modal from '../../components/common/Modal';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import { Pagination, TableToolbar } from '../../components/common/DataTable';
import { usePaged } from '../../hooks/usePaged';
import { matches } from '../../utils/table';

const vnDate = value => (value ? new Date(String(value)).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' }) : '—');
const durationLabel = days => (days % 30 === 0 ? `${days / 30} tháng` : `${days} ngày`);
const EMPTY_PLAN = { name: '', price: '', durationDays: '30', status: 'ACTIVE' };

function PlanModal({ plan, onClose, onSaved }) {
  const { token } = useAuth();
  const [form, setForm] = useState(plan ? { name: plan.name, price: String(plan.price), durationDays: String(plan.durationDays), status: plan.status } : EMPTY_PLAN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = key => value => setForm(current => ({ ...current, [key]: value }));
  const price = Number(form.price);
  const days = Number(form.durationDays);
  const invalid = !form.name.trim() ? 'Nhập tên gói.'
    : form.name.trim().length > 120 ? 'Tên gói tối đa 120 ký tự.'
      : !/^\d+$/.test(form.price) ? 'Giá phải là số nguyên VND, không âm.'
        : !/^\d+$/.test(form.durationDays) || days < 1 || days > 3650 ? 'Thời hạn từ 1 đến 3650 ngày.' : '';

  async function save() {
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError('');
    try {
      const input = { name: form.name.trim(), price, durationDays: days, status: form.status };
      if (plan) await managerApi.updatePlan(token, entityId(plan), input);
      else await managerApi.createPlan(token, input);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được gói tập.');
      setBusy(false);
    }
  }

  return (
    <Modal open title={plan ? 'Chỉnh sửa gói tập' : 'Thêm gói tập'} onClose={onClose} locked={busy}>
      <Field label="Tên gói" value={form.name} onChangeText={set('name')} placeholder="VD: Gói tháng" maxLength={120} />
      <div className="two-col">
        <Field label="Giá (VND)" inputMode="numeric" value={form.price} onChangeText={set('price')} placeholder="750000" hint={/^\d+$/.test(form.price) ? currency(price) : undefined} />
        <Field label="Thời hạn (ngày)" inputMode="numeric" value={form.durationDays} onChangeText={set('durationDays')} hint={days >= 1 ? durationLabel(days) : undefined} />
      </div>
      <div className="permission-list">
        <div>
          <div><h3>Đang mở bán</h3><p>Chỉ gói đang mở bán mới gán hoặc gia hạn được.</p></div>
          <button type="button" role="switch" aria-checked={form.status === 'ACTIVE'} aria-label="Đang mở bán" className={`switch ${form.status === 'ACTIVE' ? 'on' : ''}`} onClick={() => set('status')(form.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}><span /></button>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button secondary disabled={busy} onPress={onClose}>Hủy</Button>
        <Button icon="check" disabled={busy} onPress={save}>{busy ? 'Đang lưu…' : 'Lưu gói tập'}</Button>
      </div>
    </Modal>
  );
}

function MembershipModal({ member, plans, onClose }) {
  const { token } = useAuth();
  const id = memberId(member);
  const load = useCallback(() => managerApi.membership(token, id), [token, id]);
  const query = useApiQuery(load);
  const current = query.data;
  const active = plans.filter(plan => plan.status === 'ACTIVE');
  const [planId, setPlanId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [openedAt] = useState(() => new Date());
  const renewing = current?.status === 'ACTIVE';
  // Renewal keeps the current plan (BE rule); a new or expired membership can pick any active plan.
  const currentPlan = plans.find(plan => entityId(plan) === String(current?.planId || ''));
  const chosen = renewing ? currentPlan : active.find(plan => entityId(plan) === planId) || active[0];
  const termStart = renewing ? new Date(current.expiresAt) : openedAt;
  const newExpiry = chosen ? new Date(termStart.getTime() + chosen.durationDays * 86400000) : null;

  async function submit() {
    if (!chosen) return;
    setBusy(true);
    setError('');
    try {
      const result = renewing
        ? await managerApi.renewMembership(token, id, entityId(chosen), current.expiresAt)
        : await managerApi.assignMembership(token, id, entityId(chosen));
      setDone(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được gói thành viên.');
      query.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={renewing ? 'Gia hạn gói thành viên' : 'Gán gói thành viên'} onClose={onClose} locked={busy}>
      <div className="table-identity">
        <Avatar name={member.fullName} />
        <div><b>{member.fullName}</b><small>{member.phone}{current ? ` · ${current.planName}` : ''}</small></div>
      </div>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {done ? (
        <>
          <div className="alert-box green" role="status">
            <Icon name="checkCircle" size={19} />
            <p>Đã {renewing ? 'gia hạn' : 'gán'} gói <b>{done.planName}</b>. Hiệu lực đến <b>{vnDate(done.expiresAt)}</b>.</p>
          </div>
          <div className="modal-actions"><Button onPress={onClose}>Xong</Button></div>
        </>
      ) : !query.loading && !query.error && (
        <>
          {!renewing && (
            active.length
              ? (
                <div className="field">
                  <label htmlFor="membership-plan">{current ? 'Gói mới (gói cũ đã hết hạn)' : 'Chọn gói tập'}</label>
                  <select id="membership-plan" value={entityId(chosen)} onChange={event => setPlanId(event.target.value)}>
                    {active.map(plan => <option key={entityId(plan)} value={entityId(plan)}>{plan.name} · {currency(plan.price)} / {durationLabel(plan.durationDays)}</option>)}
                  </select>
                </div>
              )
              : <div className="alert-box amber"><Icon name="alert" size={18} /><p>Chưa có gói tập đang mở bán. Hãy thêm hoặc mở bán một gói trước.</p></div>
          )}
          {renewing && !chosen && <div className="alert-box amber"><Icon name="alert" size={18} /><p>Gói hiện tại không còn trong danh sách. Không thể gia hạn.</p></div>}
          {chosen && (
            <>
              <div className="package-option">
                <span className="metric-icon orange"><Icon name="wallet" size={22} /></span>
                <div><h3>{chosen.name}</h3><p>{durationLabel(chosen.durationDays)} · Tiện ích trung tâm</p></div>
                <strong>{currency(chosen.price)}</strong>
              </div>
              {renewing && chosen.status !== 'ACTIVE' && <div className="alert-box amber"><Icon name="alert" size={18} /><p>Gói “{chosen.name}” đang ngừng bán nên không gia hạn được.</p></div>}
              <div className="detail-grid renewal-dates">
                <div>
                  <span>Hạn hiện tại</span>
                  <b>{current ? vnDate(current.expiresAt) : 'Chưa có gói'}</b>
                  {current && <Badge status={current.status}>{current.status === 'ACTIVE' ? 'Còn hạn' : 'Hết hạn'}</Badge>}
                </div>
                <Icon name="arrow" size={22} />
                <div>
                  <span>Hạn mới</span>
                  <b className="text-orange">{vnDate(newExpiry)}</b>
                  <small>Bắt đầu kỳ: {vnDate(termStart)}</small>
                </div>
              </div>
              <div className="alert-box blue">
                <Icon name="help" size={19} />
                <p>{renewing ? 'Gói còn hiệu lực: kỳ mới nối tiếp từ hạn hiện tại, không mất ngày sử dụng.' : 'Kỳ mới bắt đầu từ hôm nay.'} Thao tác này không tạo giao dịch thanh toán — hãy thu tiền và ghi nhận riêng.</p>
              </div>
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="modal-actions">
            <Button secondary disabled={busy} onPress={onClose}>Hủy</Button>
            <Button icon={renewing ? 'repeat' : 'check'} disabled={busy || !chosen || chosen.status !== 'ACTIVE'} onPress={submit}>
              {busy ? 'Đang lưu…' : renewing ? 'Xác nhận gia hạn' : 'Gán gói'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function Packages() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'members' ? 'members' : 'plans');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const loadPlans = useCallback(() => managerApi.plans(token), [token]);
  const plans = useApiQuery(loadPlans);
  const loadMembers = useCallback(() => membersApi.list(token), [token]);
  const members = useApiQuery(loadMembers);
  const planRows = (plans.data || []).filter(plan => (filter === 'ALL' || plan.status === filter) && matches(search, plan.name));
  const memberRows = (members.data || []).filter(member => matches(search, member.fullName, member.phone));
  const pagedPlans = usePaged(planRows, `${search}|${filter}`);
  const pagedMembers = usePaged(memberRows, search);
  const switchTab = next => { setTab(next); setSearch(''); setFilter('ALL'); };

  return (
    <>
      <PageHeading
        title="Gói tập & gói thành viên"
        description="Thiết lập gói tập, biểu phí minh bạch và gia hạn cho hội viên."
        actions={<Button icon="plus" onPress={() => setEditing({})}>Thêm gói tập</Button>}
      />
      <div className="mini-stat-row">
        <div><span>Tổng số gói</span><b>{plans.data?.length ?? '—'}</b></div>
        <div><span>Đang mở bán</span><b className="text-green">{plans.data?.filter(plan => plan.status === 'ACTIVE').length ?? '—'}</b></div>
        <div><span>Ngừng bán</span><b className="text-amber">{plans.data?.filter(plan => plan.status !== 'ACTIVE').length ?? '—'}</b></div>
        <div><span>Hội viên</span><b>{members.data?.length ?? '—'}</b></div>
      </div>
      <div className="tabs">
        <button type="button" className={tab === 'plans' ? 'active' : ''} onClick={() => switchTab('plans')}>Danh sách gói</button>
        <button type="button" className={tab === 'members' ? 'active' : ''} onClick={() => switchTab('members')}>Gán / gia hạn cho hội viên</button>
      </div>

      {tab === 'plans' ? (
        <section className="card flush">
          <TableToolbar search={search} onSearch={setSearch} placeholder="Tìm tên gói…" filter={filter} onFilter={setFilter}
            options={[{ value: 'ALL', label: 'Tất cả' }, { value: 'ACTIVE', label: 'Đang mở bán' }, { value: 'INACTIVE', label: 'Ngừng bán' }]} />
          <QueryStatus loading={plans.loading} error={plans.error} retry={plans.reload} />
          {plans.data && (
            <>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>GÓI TẬP</th><th>GIÁ</th><th>THỜI HẠN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
                  <tbody>
                    {pagedPlans.visible.map(plan => (
                      <tr key={entityId(plan)}>
                        <td>
                          <div className="table-identity">
                            <span className="metric-icon orange"><Icon name="wallet" size={19} /></span>
                            <div><b>{plan.name}</b><small>Cập nhật {vnDate(plan.updatedAt || plan.createdAt)}</small></div>
                          </div>
                        </td>
                        <td><b>{currency(plan.price)}</b></td>
                        <td>{durationLabel(plan.durationDays)}{plan.durationDays % 30 === 0 && <small>{plan.durationDays} ngày</small>}</td>
                        <td><Badge status={plan.status}>{plan.status === 'ACTIVE' ? 'Đang mở bán' : 'Ngừng bán'}</Badge></td>
                        <td><div className="row-actions"><button type="button" className="text-btn" onClick={() => setEditing(plan)}>Chỉnh sửa</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!planRows.length && <Empty text={plans.data.length ? 'Không có gói phù hợp' : 'Chưa có gói tập'} detail={plans.data.length ? 'Thử từ khóa hoặc bộ lọc khác.' : 'Thêm gói đầu tiên để gán cho hội viên.'} icon="wallet" />}
              </div>
              <Pagination paged={pagedPlans} />
            </>
          )}
        </section>
      ) : (
        <section className="card flush">
          <TableToolbar search={search} onSearch={setSearch} placeholder="Tìm tên hoặc số điện thoại hội viên…" />
          <QueryStatus loading={members.loading} error={members.error} retry={members.reload} />
          {members.data && (
            <>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>HỘI VIÊN</th><th>LIÊN HỆ</th><th>THAO TÁC</th></tr></thead>
                  <tbody>
                    {pagedMembers.visible.map((member, index) => (
                      <tr key={memberId(member)}>
                        <td><div className="table-identity"><Avatar name={member.fullName} index={index} /><div><b>{member.fullName}</b><small>{memberId(member)}</small></div></div></td>
                        <td>{member.phone}</td>
                        <td><div className="row-actions"><Button small secondary icon="wallet" disabled={!plans.data} onPress={() => setAssigning(member)}>Gói thành viên</Button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!memberRows.length && <Empty text="Không tìm thấy hội viên" detail="Thử tìm bằng tên hoặc số điện thoại khác." />}
              </div>
              <Pagination paged={pagedMembers} />
            </>
          )}
        </section>
      )}
      <div className="info-strip"><Icon name="help" size={18} />Gói thành viên không bao gồm học phí lớp học. Gán / gia hạn không tạo giao dịch thanh toán.</div>

      {editing && <PlanModal plan={editing._id || editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); plans.reload(); }} />}
      {assigning && plans.data && <MembershipModal member={assigning} plans={plans.data} onClose={() => setAssigning(null)} />}
    </>
  );
}
