import { useState } from "react";
import { ManagerAttendanceReport } from "../../components/common/ManagerAttendanceReport.jsx";
import { Card, EmptyState, Field, PageHeader, SummaryGrid } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { reportApi } from "../../services/api/resources.js";
import { formatters } from "../../utils/formatters.js";
import { uiLabel } from "../../utils/vietnamese.js";
import { useQuery } from "../../store/useQuery.js";
function Distribution({ title, rows }) {
  return <Card><h2>{title}</h2>{rows.length ? <div className="stack-list">{rows.map((row, i) => <div key={row.id || row.label || i}><span>{uiLabel(row.label)}</span><strong>{row.value}</strong></div>)}</div> : <EmptyState title="Chưa có dữ liệu trong khoảng ngày" />}</Card>;
}
export function ManagerReportsPage() {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const query = useQuery(() => reportApi.summary({ from, to }), [from, to]);
  return <><PageHeader title="Báo cáo học phí và đăng ký" subtitle="Doanh thu chỉ tính giao dịch thành công theo ngày thanh toán, múi giờ Việt Nam. Tổng tài khoản là số liệu hiện tại." /><div className="form-grid"><Field label="Từ ngày" type="date" value={from} onChange={setFrom} /><Field label="Đến ngày" type="date" value={to} onChange={setTo} /></div><AsyncPanel query={query}>{data => <>
    <SummaryGrid items={[{ label: "Tài khoản thành viên", value: data.totals.registeredAccounts }, { label: "Tài khoản đang hoạt động", value: data.totals.activeAccounts }, { label: "Khóa học", value: data.totals.courses }, { label: "Lớp học", value: data.totals.classes }, { label: "Huấn luyện viên", value: data.totals.coaches }, { label: "Doanh thu thành công", value: formatters.money(data.revenue.amount) }]} />
    <div className="two-col"><Distribution title="Trạng thái đăng ký" rows={Object.entries(data.registrations).map(([label, value]) => ({ label, value }))} /><Distribution title="Trạng thái thanh toán" rows={Object.entries(data.paymentStatuses).map(([label, value]) => ({ label, value }))} /></div>
    <div className="card-grid mt">{[["Theo tháng", data.revenue.byMonth], ["Theo lớp", data.revenue.byClass], ["Theo khóa học", data.revenue.byCourse]].map(([title, rows]) => <Distribution key={title} title={title} rows={rows.map(row => ({ id: row._id, label: row.name || row._id || "Chưa có thông tin", value: formatters.money(row.amount) }))} />)}</div>
  </>}</AsyncPanel><ManagerAttendanceReport /></>;
}
