import { useState } from "react";
import { Badge, Card, EmptyState, Field, SelectField } from "./UI.jsx";
import { uiLabel } from "../../utils/vietnamese.js";
import { formatters } from "../../utils/formatters.js";
export function PaymentHistory({ payments }) {
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const rows = payments.filter(p => {
    const day = (p.paymentDate || p.createdAt || "").slice(0, 10);
    return (!status || p.status === status) && (!from || day >= from) && (!to || day <= to) &&
      [p.member?.name, p.classItem?.name, p.id].join(" ").toLowerCase().includes(query.toLowerCase());
  });
  return <Card className="table-card mt"><div className="card-title"><strong>Lịch sử giao dịch</strong></div><div className="form-grid">
    <Field label="Tìm thành viên, lớp hoặc mã giao dịch" value={query} onChange={setQuery} />
    <SelectField label="Trạng thái giao dịch" value={status} onChange={setStatus}><option value="">Tất cả</option>{["PENDING", "SUCCESS", "FAILED"].map(v => <option key={v} value={v}>{uiLabel(v)}</option>)}</SelectField>
    <Field label="Từ ngày" type="date" value={from} onChange={setFrom} /><Field label="Đến ngày" type="date" value={to} onChange={setTo} />
  </div><p>Lọc theo ngày thanh toán, hoặc ngày tạo nếu chưa thanh toán. Doanh thu thành công trong kết quả: {formatters.money(rows.filter(p => p.status === "SUCCESS").reduce((sum, p) => sum + p.amount, 0))}.</p>
    {rows.length ? <div style={{ overflowX: "auto" }}><table><thead><tr><th>Giao dịch</th><th>Thành viên / lớp</th><th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Thời điểm</th></tr></thead><tbody>{rows.map(p => <tr key={p.id}><td>{p.id}</td><td>{p.member?.name || "Chưa có thông tin"}<br />{p.classItem?.name}</td><td>{formatters.money(p.amount)}</td><td>{uiLabel(p.paymentMethod)}</td><td><Badge tone={p.status === "SUCCESS" ? "green" : p.status === "FAILED" ? "rose" : "amber"}>{p.status}</Badge></td><td>{formatters.dateTime(p.paymentDate || p.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có giao dịch phù hợp" />}
  </Card>;
}
