import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../api/staff';
import { entityId, referenceId, referenceLabel, subjectsApi } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmButton from '../../components/common/ConfirmButton';
import Empty from '../../components/common/Empty';
import Field from '../../components/common/Field';
import Modal from '../../components/common/Modal';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import { Pagination, TableToolbar } from '../../components/common/DataTable';
import { usePaged } from '../../hooks/usePaged';
import { matches } from '../../utils/table';

const ROLE_LABELS = { COACH: 'Huấn luyện viên', RECEPTIONIST: 'Lễ tân' };
const isPhone = value => /^(0|\+84)\d{9,10}$/.test(value.replace(/[\s.-]/g, ''));

function StaffModal({ account, subjects, onClose, onSaved }) {
  const { token } = useAuth();
  const initialSubject = referenceId(account.coach?.subjectId);
  const [form, setForm] = useState({ fullName: account.fullName || '', phone: account.phone || '', role: account.role, subjectId: initialSubject });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = key => value => setForm(current => ({ ...current, [key]: value }));
  const invalid = !form.fullName.trim() ? 'Nhập họ tên.'
    : !isPhone(form.phone) ? 'Số điện thoại không hợp lệ.'
      : form.role === 'COACH' && !form.subjectId ? 'Chọn môn phụ trách cho huấn luyện viên.' : '';

  async function save() {
    if (invalid) { setError(invalid); return; }
    // Send only changed fields; subjectId is only valid for a coach.
    const input = {};
    if (form.fullName.trim() !== account.fullName) input.fullName = form.fullName.trim();
    if (form.phone.replace(/[\s.-]/g, '') !== account.phone) input.phone = form.phone.replace(/[\s.-]/g, '');
    if (form.role !== account.role) input.role = form.role;
    if (form.role === 'COACH' && form.subjectId !== initialSubject) input.subjectId = form.subjectId;
    if (!Object.keys(input).length) { onClose(); return; }
    setBusy(true);
    setError('');
    try {
      await staffApi.update(token, entityId(account), input);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được tài khoản.');
      setBusy(false);
    }
  }

  return (
    <Modal open title="Chỉnh sửa nhân sự" onClose={onClose} locked={busy}>
      <div className="table-identity">
        <Avatar name={account.fullName} />
        <div><b>{account.email}</b><small>Email đăng nhập không đổi được</small></div>
      </div>
      <Field label="Họ tên" value={form.fullName} onChangeText={set('fullName')} />
      <Field label="Số điện thoại" type="tel" value={form.phone} onChangeText={set('phone')} />
      <div className="field">
        <label>Vai trò</label>
        <div className="segmented">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <button type="button" key={value} className={form.role === value ? 'active' : ''} onClick={() => set('role')(value)}>{label}</button>
          ))}
        </div>
        {form.role !== account.role && <small>Đổi vai trò sẽ đăng xuất tài khoản này khỏi mọi thiết bị.</small>}
      </div>
      {form.role === 'COACH' && (
        <div className="field">
          <label htmlFor="staff-subject">Môn phụ trách</label>
          <select id="staff-subject" value={form.subjectId} onChange={event => set('subjectId')(event.target.value)}>
            <option value="">— Chọn môn —</option>
            {(subjects || []).map(subject => <option key={entityId(subject)} value={entityId(subject)}>{subject.name}</option>)}
          </select>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button secondary disabled={busy} onPress={onClose}>Hủy</Button>
        <Button icon="check" disabled={busy} onPress={save}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</Button>
      </div>
    </Modal>
  );
}

export default function Staff() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => staffApi.list(token), [token]);
  const query = useApiQuery(load);
  const loadSubjects = useCallback(() => subjectsApi.list(token), [token]);
  const subjects = useApiQuery(loadSubjects);
  const subjectName = account => {
    const id = referenceId(account.coach?.subjectId);
    return subjects.data?.find(subject => entityId(subject) === id)?.name || (id ? referenceLabel(account.coach.subjectId) : '');
  };
  const items = query.data || [];
  const rows = items.filter(account => (filter === 'ALL' || account.role === filter || account.status === filter)
    && matches(search, account.fullName, account.email, account.phone));
  const paged = usePaged(rows, `${search}|${filter}`);

  return (
    <>
      <PageHeading
        title="Huấn luyện viên & nhân sự"
        description="Quản lý tài khoản huấn luyện viên và lễ tân của trung tâm."
        actions={<Button icon="plus" onPress={() => navigate('/staff-accounts')}>Tạo tài khoản</Button>}
      />
      <div className="mini-stat-row">
        <div><span>Tổng nhân sự</span><b>{query.data ? items.length : '—'}</b></div>
        <div><span>Huấn luyện viên</span><b>{query.data ? items.filter(item => item.role === 'COACH').length : '—'}</b></div>
        <div><span>Lễ tân</span><b>{query.data ? items.filter(item => item.role === 'RECEPTIONIST').length : '—'}</b></div>
        <div><span>Đã khóa</span><b className="text-amber">{query.data ? items.filter(item => item.status !== 'ACTIVE').length : '—'}</b></div>
      </div>
      <section className="card flush">
        <TableToolbar search={search} onSearch={setSearch} placeholder="Tìm tên, email hoặc số điện thoại…" filter={filter} onFilter={setFilter}
          options={[{ value: 'ALL', label: 'Tất cả' }, { value: 'COACH', label: 'Huấn luyện viên' }, { value: 'RECEPTIONIST', label: 'Lễ tân' }, { value: 'INACTIVE', label: 'Đã khóa' }]} />
        <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
        {query.data && (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>NHÂN SỰ</th><th>LIÊN HỆ</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
                <tbody>
                  {paged.visible.map((account, index) => {
                    const active = account.status === 'ACTIVE';
                    return (
                      <tr key={entityId(account)}>
                        <td>
                          <div className="table-identity">
                            <Avatar name={account.fullName || account.email} index={index} />
                            <div><b>{account.fullName || 'Chưa có tên'}</b><small>{account.role === 'COACH' ? subjectName(account) || 'Chưa có môn' : 'Quầy lễ tân'}</small></div>
                          </div>
                        </td>
                        <td>{account.phone || '—'}<small>{account.email}</small></td>
                        <td>{ROLE_LABELS[account.role] || account.role}</td>
                        <td><Badge status={account.status}>{active ? 'Đang hoạt động' : 'Đã khóa'}</Badge></td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="text-btn" onClick={() => setEditing(account)}>Chỉnh sửa</button>
                            <ConfirmButton
                              small secondary danger={active}
                              label={active ? 'Khóa' : 'Mở khóa'}
                              title={`${active ? 'Khóa' : 'Mở khóa'} tài khoản ${account.fullName || account.email}?`}
                              description={active ? 'Tài khoản sẽ bị đăng xuất và không thể đăng nhập cho tới khi được mở khóa. Dữ liệu lớp học vẫn được giữ nguyên.' : 'Nhân sự có thể đăng nhập lại bằng mật khẩu hiện tại.'}
                              confirmLabel={active ? 'Khóa tài khoản' : 'Mở khóa'} busyLabel="Đang lưu…"
                              onConfirm={() => staffApi.update(token, entityId(account), { status: active ? 'INACTIVE' : 'ACTIVE' })}
                              onDone={query.reload}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <Empty text={items.length ? 'Không tìm thấy nhân sự' : 'Chưa có tài khoản nhân sự'} detail={items.length ? 'Thử từ khóa hoặc bộ lọc khác.' : 'Tạo tài khoản huấn luyện viên hoặc lễ tân đầu tiên.'} icon="user" />}
            </div>
            <Pagination paged={paged} />
          </>
        )}
      </section>
      {editing && <StaffModal account={editing} subjects={subjects.data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); query.reload(); }} />}
    </>
  );
}
