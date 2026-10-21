import { Card, EmptyState, Icon, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { formatters, reportService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
export function ManagerAuditLogPage() { const query = useQuery(() => reportService.getAuditLog()); return <><PageHeader title="Nhật ký hoạt động" subtitle="Nhật ký hoạt động được ghi nhận trong hệ thống." /><AsyncPanel query={query}>{(rows) => <Card>{rows.length ? <div className="activity-list large">{rows.map((r) => <div key={r.id}><Icon name="history" /><span><strong>{r.action}</strong><small>{r.actor}</small></span><time>{formatters.dateTime(r.createdAt)}</time></div>)}</div> : <EmptyState title="Chưa có hoạt động" />}</Card>}</AsyncPanel></>; }
