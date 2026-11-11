import { useState } from "react";
import { Badge, Button, Card, EmptyState, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { notificationApi } from "../../services/api/resources.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

export function NotificationsPage() {
  const query = useQuery(() => notificationApi.my());
  const mutation = useMutation();
  const [filter, setFilter] = useState("");
  return <><PageHeader title="Thông báo" subtitle="Thông báo trong ứng dụng dành cho tài khoản của bạn." />
    <SelectField label="Lọc thông báo" value={filter} onChange={setFilter}><option value="">Tất cả</option><option value="unread">Chưa đọc</option><option value="read">Đã đọc</option></SelectField>
    <ErrorMessage error={mutation.error} /><AsyncPanel query={query}>{rows => {
      const visible = rows.filter(row => !filter || row.isRead === (filter === "read"));
      return visible.length ? <div className="card-grid mt">{visible.map(row => <Card key={row.id}><Badge tone={row.isRead ? "green" : "amber"}>{row.isRead ? "Đã đọc" : "Chưa đọc"}</Badge><h2>{row.title}</h2><p>{row.message}</p><small>{formatters.dateTime(row.createdAt)}</small><p><Button variant="secondary" disabled={mutation.pending} onClick={() => mutation.run(() => notificationApi.update(row.id, { isRead: !row.isRead }), query.reload)}>{row.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}</Button></p></Card>)}</div> : <Card className="mt"><EmptyState title={rows.length ? "Không có thông báo trong bộ lọc này" : "Chưa có thông báo phù hợp"} /></Card>;
    }}</AsyncPanel></>;
}
