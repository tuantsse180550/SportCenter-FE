import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useActorProfile } from '../../hooks/useActorProfile';
import { canManagePayments, currency, ownPayments, paymentMethods, paymentsApi, registrationFor } from '../../api/payments';
import { classRegistrationsApi, entityId, referenceLabel } from '../../api/operations';
import { statusLabels } from '../../utils/resource-display';
import { withQuery } from '../../utils/url';
import AccessScreen from '../../components/common/AccessScreen';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import SubjectFilter from '../../components/common/SubjectFilter';
import { loadSubjectIndex, subjectCounts, subjectOf } from '../../utils/subject-filter';
import { Pagination, TableToolbar } from '../../components/common/DataTable';
import { usePaged } from '../../hooks/usePaged';
import { matches } from '../../utils/table';

const filters = [['ALL', 'Tất cả'], ['PENDING', 'Chờ thanh toán'], ['SUCCESS', 'Thành công'], ['FAILED', 'Thất bại']];
const methodLabel = value => paymentMethods.find(method => method.value === value)?.label || String(value || '');
const dateTime = value => (value ? new Date(String(value)).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }) : '');

export default function Payments() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const actor = useActorProfile(member);
  const actorId = actor.data ? entityId(actor.data) : '';
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const loadIndex = useCallback(() => loadSubjectIndex(token), [token]);
  const subjectIndex = useApiQuery(loadIndex).data;
  const load = useCallback(async () => {
    const [items, registrations] = await Promise.all([paymentsApi.list(token), classRegistrationsApi.list(token)]);
    return { items: member ? ownPayments(items, registrations, actorId) : items, registrations };
  }, [token, member, actorId]);
  const query = useApiQuery(load, canManagePayments(user.role) && (!member || !!actorId));
  const all = query.data?.items || [];
  const registrations = query.data?.registrations || [];
  const sportOf = item => subjectOf('class-registrations', registrationFor(item, registrations), subjectIndex);
  const rows = all.filter(item => {
    const registration = registrationFor(item, registrations);
    return (filter === 'ALL' || item.status === filter)
      && (!subject || !subjectIndex || sportOf(item) === (subject === '-' ? '' : subject))
      && matches(search, referenceLabel(registration?.classId), referenceLabel(registration?.memberId), methodLabel(item.paymentMethod), item.amount);
  });
  const paged = usePaged(rows, `${search}|${filter}|${subject}`);
  const subjectOptions = subjectIndex ? subjectCounts('payments', all.map(item => ({ classId: registrationFor(item, registrations)?.classId || null })), subjectIndex) : [];

  if (!canManagePayments(user.role)) return <AccessScreen denied />;
  const collected = all.filter(item => item.status === 'SUCCESS').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  // A pending payment of a cancelled registration is no longer due.
  const pending = all.filter(item => item.status === 'PENDING' && registrationFor(item, registrations)?.status !== 'CANCELLED');

  return (
    <>
      <PageHeading
        title={member ? 'Thanh toán của tôi' : 'Quản lý thanh toán'}
        description="Học phí tính theo lớp học. Trạng thái chỉ cập nhật khi hệ thống xác nhận kết quả."
        actions={<Button icon="plus" disabled={member && !actorId} onPress={() => navigate('/payment-edit')}>Tạo yêu cầu thanh toán</Button>}
      />
      {member && <QueryStatus loading={actor.loading} error={actor.error} retry={actor.reload} />}
      <div className="mini-stat-row">
        <div><span>Tổng giao dịch</span><b>{query.data ? all.length : '—'}</b></div>
        <div><span>{member ? 'Đã thanh toán' : 'Đã thu'}</span><b className="text-green">{query.data ? currency(collected) : '—'}</b></div>
        <div><span>Chờ thanh toán</span><b className="text-amber">{query.data ? pending.length : '—'}</b></div>
        <div><span>Số tiền chờ</span><b>{query.data ? currency(pending.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)) : '—'}</b></div>
      </div>
      <SubjectFilter options={subjectOptions} value={subject} onChange={setSubject} total={all.length} />
      <section className="card flush">
        <TableToolbar search={search} onSearch={setSearch} placeholder={member ? 'Tìm lớp hoặc phương thức…' : 'Tìm hội viên, lớp hoặc phương thức…'}
          filter={filter} onFilter={setFilter} options={filters.map(([value, label]) => ({ value, label }))} />
        <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
        {query.data && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>LỚP HỌC</th>{!member && <th>HỘI VIÊN</th>}<th>SỐ TIỀN</th><th>PHƯƠNG THỨC</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr>
                </thead>
                <tbody>
                  {paged.visible.map(item => {
                    const registration = registrationFor(item, registrations);
                    const voided = item.status === 'PENDING' && registration?.status === 'CANCELLED';
                    return (
                      <tr key={entityId(item)}>
                        <td><b>{referenceLabel(registration?.classId)}</b><small>{dateTime(item.paymentDate || item.createdAt)}</small></td>
                        {!member && <td>{registration && !registration.memberId ? <span className="danger-text">Hồ sơ đã bị xóa</span> : referenceLabel(registration?.memberId)}</td>}
                        <td><b>{currency(item.amount)}</b></td>
                        <td>{methodLabel(item.paymentMethod)}</td>
                        <td>
                          <Badge status={voided ? 'CANCELLED' : item.status}>{voided ? 'Đăng ký đã hủy' : item.status === 'PENDING' ? 'Chờ thanh toán' : statusLabels[item.status] || item.status}</Badge>
                        </td>
                        <td>
                          <div className="row-actions wrap">
                            {registration && <button type="button" className="text-btn" title="Mở đăng ký lớp của khoản thanh toán này" onClick={() => navigate(withQuery('/registration-detail', { id: entityId(registration) }))}>Xem đăng ký</button>}
                            {item.status === 'SUCCESS' && <Button secondary small icon="file" onPress={() => navigate(withQuery('/payment-receipt', { id: entityId(item) }))}>Hóa đơn</Button>}
                            {item.status === 'PENDING' && !voided && <Button small icon="wallet" onPress={() => navigate(withQuery('/payment-edit', { id: entityId(item) }))}>{member ? 'Thanh toán' : 'Xử lý'}</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <Empty text={all.length ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch'} detail={all.length ? 'Thử từ khóa hoặc bộ lọc khác.' : 'Giao dịch xuất hiện khi có yêu cầu thanh toán học phí.'} icon="wallet" />}
            </div>
            <Pagination paged={paged} />
          </>
        )}
      </section>
    </>
  );
}
