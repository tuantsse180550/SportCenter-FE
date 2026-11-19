import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { membersApi, memberId, memberLevels } from '../../api/members';
import { canDeleteMembers, canManageMembers } from '../../utils/permissions';
import { useApiQuery } from '../../hooks/useApiQuery';
import { withQuery } from '../../utils/url';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import ConfirmButton from '../../components/common/ConfirmButton';
import Empty from '../../components/common/Empty';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import { Pagination, TableToolbar } from '../../components/common/DataTable';
import { usePaged } from '../../hooks/usePaged';

const levelLabel = value => memberLevels.find(level => level.value === value)?.label || value || '—';

/** Member search uses the BE ?q= filter (name / phone), debounced; level filter is client-side. */
export default function MemberList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, token } = useAuth();
  const [search, setSearch] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(search);
  const [level, setLevel] = useState('ALL');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(() => membersApi.list(token, debounced), [token, debounced]);
  const query = useApiQuery(load);
  const manage = canManageMembers(user.role);
  const staff = ['RECEPTIONIST', 'CENTER_MANAGER'].includes(user.role);
  const all = query.data || [];
  const rows = all.filter(item => level === 'ALL' || item.level === level);
  const paged = usePaged(rows, `${debounced}|${level}`);

  return (
    <>
      <PageHeading
        title={user.role === 'COACH' ? 'Hội viên trung tâm' : 'Quản lý hội viên'}
        description="Mọi thông tin hội viên, mục tiêu và trình độ trong một nơi."
        actions={manage && (
          <>
            <Button secondary icon="user" onPress={() => navigate('/members/edit')}>Hồ sơ cho tài khoản có sẵn</Button>
            <Button icon="plus" onPress={() => navigate('/members/front-desk')}>Đăng ký hội viên tại quầy</Button>
          </>
        )}
      />
      <div className="mini-stat-row">
        <div><span>{debounced ? 'Kết quả tìm kiếm' : 'Tổng hội viên'}</span><b>{query.data ? all.length : '—'}</b></div>
        {memberLevels.map(item => (
          <div key={item.value}><span>{item.label}</span><b>{query.data ? all.filter(member => member.level === item.value).length : '—'}</b></div>
        ))}
      </div>
      <section className="card flush">
        <TableToolbar search={search} onSearch={setSearch} placeholder="Tìm tên hoặc số điện thoại…" filter={level} onFilter={setLevel}
          options={[{ value: 'ALL', label: 'Mọi trình độ' }, ...memberLevels]} />
        <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
        {query.data && (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>HỘI VIÊN</th><th>LIÊN HỆ</th><th>TRÌNH ĐỘ</th><th>MỤC TIÊU</th><th>THAO TÁC</th></tr></thead>
                <tbody>
                  {paged.visible.map((item, index) => (
                    <tr key={memberId(item)}>
                      <td>
                        <div className="table-identity">
                          <Avatar name={item.fullName} index={index} />
                          <div><b>{item.fullName}</b><small>{memberId(item)}</small></div>
                        </div>
                      </td>
                      <td>{item.phone}{typeof item.userId === 'object' && item.userId?.email && <small>{item.userId.email}</small>}</td>
                      <td>{levelLabel(item.level)}</td>
                      <td className="cell-detail">{item.goal || 'Chưa có mục tiêu'}</td>
                      <td>
                        <div className="row-actions wrap">
                          {staff && <Button small onPress={() => navigate('/enroll', { state: { member: item } })}>Đăng ký lớp</Button>}
                          {user.role === 'CENTER_MANAGER' && <Button secondary small icon="wallet" onPress={() => navigate(withQuery('/packages', { tab: 'members' }))}>Gói</Button>}
                          {manage && <button type="button" className="text-btn" onClick={() => navigate(withQuery('/members/edit', { id: memberId(item) }))}>Chỉnh sửa</button>}
                          {canDeleteMembers(user.role) && (
                            <ConfirmButton
                              small secondary danger label="Xóa" title={`Xóa hồ sơ ${item.fullName}?`}
                              description="Thao tác xóa hồ sơ hội viên không thể hoàn tác. Tài khoản đăng nhập vẫn còn trên hệ thống."
                              confirmLabel="Xác nhận xóa hồ sơ" busyLabel="Đang xóa…"
                              onConfirm={() => membersApi.remove(token, memberId(item))} onDone={query.reload}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <Empty text={debounced || level !== 'ALL' ? 'Không tìm thấy hội viên' : 'Chưa có hồ sơ hội viên'} detail={debounced || level !== 'ALL' ? 'Thử tìm bằng tên hoặc số điện thoại khác.' : undefined} />}
            </div>
            <Pagination paged={paged} />
          </>
        )}
      </section>
    </>
  );
}
