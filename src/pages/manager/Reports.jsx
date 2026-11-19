import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { daysInclusive, managerApi } from '../../api/manager';
import { currency } from '../../api/payments';
import { useApiQuery } from '../../hooks/useApiQuery';
import { addDays, dayMonth, isIsoDate } from '../../utils/schedule-time';
import { bangkokDate, workspacePath } from '../../utils/url';
import Badge from '../../components/common/Badge';
import BarChart from '../../components/common/BarChart';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import Field from '../../components/common/Field';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';
import { csvCell, downloadText } from '../../utils/table';

const STATUS_ROWS = [
  ['CONFIRMED', 'Đã xác nhận'],
  ['PENDING_PAYMENT', 'Chờ thanh toán'],
  ['CANCELLED', 'Đã hủy'],
];
/** BE gives registrations per status ({ PENDING_PAYMENT, CONFIRMED, CANCELLED }); older shape was a number. */
const countOf = value => (typeof value === 'number' ? value : Object.values(value || {}).reduce((sum, n) => sum + (Number(n) || 0), 0));
const vnDate = iso => iso.split('-').reverse().join('/');

/** Group daily rows so long ranges stay readable (≤ 14 bars). */
function chartBars(daily) {
  if (daily.length <= 14) return daily.map(day => ({ label: dayMonth(day.date), value: day.revenue, title: `${vnDate(day.date)}: ${currency(day.revenue)}` }));
  const size = Math.ceil(daily.length / 12);
  return Array.from({ length: Math.ceil(daily.length / size) }, (_, index) => {
    const slice = daily.slice(index * size, index * size + size);
    const value = slice.reduce((sum, day) => sum + day.revenue, 0);
    return { label: dayMonth(slice[0].date), value, title: `${vnDate(slice[0].date)} – ${vnDate(slice.at(-1).date)}: ${currency(value)}` };
  });
}

/** Daily rows + total line as CSV (module scope so the compiler never reads a null report during render). */
function exportCsv(report, registrations, from, to) {
  const { summary } = report;
  const lines = [
    ['Ngày', 'Hội viên mới', 'Đăng ký', 'Giao dịch thành công', 'Doanh thu (VND)'].join(','),
    ...report.daily.map(day => [vnDate(day.date), day.newMembers, countOf(day.registrations), day.successfulPayments, day.revenue].map(csvCell).join(',')),
    ['Tổng', summary.newMembers, registrations, summary.successfulPayments, summary.revenue].map(csvCell).join(','),
  ];
  downloadText(`bao-cao-${from}-${to}.csv`, lines.join('\n'));
}

export default function Reports() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const today = bangkokDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const rangeError = !isIsoDate(from) || !isIsoDate(to) ? 'Chọn đủ ngày bắt đầu và kết thúc.'
    : from > to ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'
      : daysInclusive(from, to) > 366 ? 'Khoảng thời gian tối đa 366 ngày.' : '';
  const load = useCallback(() => managerApi.report(token, from, to), [token, from, to]);
  const query = useApiQuery(load, !rangeError);
  const report = query.data;
  const summary = report?.summary;
  const registrations = summary ? STATUS_ROWS.reduce((sum, [status]) => sum + (summary.registrations?.[status] || 0), 0) : 0;
  const presets = [
    ['7 ngày', addDays(today, -6), today],
    ['30 ngày', addDays(today, -29), today],
    ['Tháng này', `${today.slice(0, 7)}-01`, today],
    ['Năm nay', `${today.slice(0, 4)}-01-01`, today],
  ];

  return (
    <>
      <PageHeading
        title="Báo cáo & doanh thu"
        description="Dữ liệu rõ ràng, quyết định vững vàng. Doanh thu theo ngày thực thu."
        actions={<Button icon="download" disabled={!report} onPress={() => exportCsv(report, registrations, from, to)}>Xuất báo cáo CSV</Button>}
      />
      <section className="card report-filters">
        <Field label="Từ ngày" type="date" value={from} max={to} onChangeText={setFrom} />
        <Field label="Đến ngày" type="date" value={to} min={from} max={today} onChangeText={setTo} />
        <div className="field">
          <label>Chọn nhanh</label>
          <div className="segmented">
            {presets.map(([label, start, end]) => (
              <button type="button" key={label} className={from === start && to === end ? 'active' : ''} onClick={() => { setFrom(start); setTo(end); }}>{label}</button>
            ))}
          </div>
        </div>
      </section>
      {rangeError && <div className="alert-box amber" role="alert"><Icon name="alert" size={18} /><p>{rangeError}</p></div>}
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />

      {report && (
        <>
          <div className="metric-grid report-metrics">
            {[
              ['Tổng hội viên', summary.totalMembers, 'users', 'Hiện có trên hệ thống', '/members'],
              ['Hội viên mới', summary.newMembers, 'user', `Trong ${daysInclusive(from, to)} ngày đã chọn`, '/members'],
              ['Đăng ký trong kỳ', registrations, 'layers', `${summary.registrations?.CONFIRMED || 0} đã xác nhận`, workspacePath('class-registrations')],
              ['Doanh thu thực thu', currency(summary.revenue), 'wallet', `${summary.successfulPayments} giao dịch thành công`, '/payments'],
            ].map(([label, value, icon, detail, path]) => (
              <button type="button" className="metric-card" key={label} onClick={() => navigate(path)}>
                <div className="metric-label">{label}<Icon name={icon} size={19} /></div>
                <strong className={String(value).length > 14 ? 'compact-value' : ''}>{value}</strong>
                <small>{detail}</small>
              </button>
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="card flush revenue-card">
              <div className="card-heading">
                <h2>Biểu đồ thực thu</h2>
                <span className="subtle-tag">{vnDate(from)} – {vnDate(to)}</span>
              </div>
              {report.daily.length ? <BarChart large bars={chartBars(report.daily)} /> : <Empty text="Chưa có dữ liệu trong kỳ" icon="chart" />}
              <div className="chart-caption">
                Học phí lớp {currency(summary.classRevenue)} · Gói tập {currency(summary.membershipRevenue)}. Chỉ gồm giao dịch thành công, tính theo ngày thanh toán.
              </div>
            </section>
            <section className="card flush">
              <div className="card-heading"><h2>Trạng thái đăng ký</h2></div>
              <div className="status-report">
                {STATUS_ROWS.map(([status, label]) => {
                  const count = summary.registrations?.[status] || 0;
                  return (
                    <div key={status}>
                      <Badge status={status}>{label}</Badge>
                      <b>{count}</b>
                      <div className="capacity-track"><i style={{ width: `${registrations ? (count / registrations) * 100 : 0}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="card flush">
            <div className="card-heading"><h2>Chi tiết theo ngày</h2><span className="subtle-tag">{report.daily.length} ngày</span></div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>NGÀY</th><th>HỘI VIÊN MỚI</th><th>ĐĂNG KÝ</th><th>GIAO DỊCH</th><th>DOANH THU</th></tr>
                </thead>
                <tbody>
                  {[...report.daily].reverse().filter(day => day.newMembers || countOf(day.registrations) || day.successfulPayments).map(day => (
                    <tr key={day.date}>
                      <td><b>{vnDate(day.date)}</b></td>
                      <td>{day.newMembers}</td>
                      <td>{countOf(day.registrations)}{day.registrations?.CONFIRMED ? <small>{day.registrations.CONFIRMED} đã xác nhận</small> : null}</td>
                      <td>{day.successfulPayments}</td>
                      <td><b>{currency(day.revenue)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!report.daily.some(day => day.newMembers || countOf(day.registrations) || day.successfulPayments) && <Empty text="Không có hoạt động trong kỳ" detail="Thử chọn khoảng thời gian khác." icon="chart" />}
            </div>
          </section>
        </>
      )}
    </>
  );
}
