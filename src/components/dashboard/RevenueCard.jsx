import { useCallback, useState } from 'react';
import { managerApi } from '../../api/manager';
import { currency } from '../../api/payments';
import { useApiQuery } from '../../hooks/useApiQuery';
import { addDays, dayMonth } from '../../utils/schedule-time';
import { bangkokDate } from '../../utils/url';
import BarChart from '../common/BarChart';
import QueryStatus from '../common/QueryStatus';

/** Manager dashboard revenue card: collected revenue (class fees + membership orders) from the team report API. */
export default function RevenueCard({ token }) {
  const [range, setRange] = useState('week');
  const today = bangkokDate();
  const from = range === 'week' ? addDays(today, -6) : `${today.slice(0, 7)}-01`;
  const load = useCallback(() => managerApi.report(token, from, today), [token, from, today]);
  const query = useApiQuery(load);
  const daily = query.data?.daily || [];
  // Month view: group days into 5-day buckets like the design.
  const bars = range === 'week'
    ? daily.map(day => ({ label: dayMonth(day.date), value: day.revenue }))
    : Array.from({ length: Math.ceil(daily.length / 5) }, (_, index) => {
      const slice = daily.slice(index * 5, index * 5 + 5);
      return { label: `${slice[0].date.slice(8, 10)}–${slice.at(-1).date.slice(8, 10)}`, value: slice.reduce((sum, day) => sum + day.revenue, 0) };
    });

  return (
    <section className="card flush revenue-card">
      <div className="card-heading">
        <h2>Tổng quan doanh thu <span className="subtle-tag">Thực thu</span></h2>
        <select value={range} onChange={event => setRange(event.target.value)} aria-label="Khoảng thời gian">
          <option value="week">7 ngày qua</option>
          <option value="month">Tháng này</option>
        </select>
      </div>
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />
      {query.data && (
        <>
          <div className="chart-summary">
            <strong>{currency(query.data.summary.revenue)}</strong>
            <span><i /> {query.data.summary.successfulPayments} giao dịch thành công</span>
          </div>
          <BarChart bars={bars} />
          <div className="chart-caption">Gồm học phí lớp và gói tập, tính theo ngày thực thu, không theo ngày đăng ký.</div>
        </>
      )}
    </section>
  );
}
