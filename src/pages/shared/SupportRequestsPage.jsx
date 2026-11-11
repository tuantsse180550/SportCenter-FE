import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SelectField } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { memberApi, supportRequestApi } from "../../services/api/resources.js";
import { useApp } from "../../store/useApp.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

function HandlingForm({ request, reload }) {
  const [note, setNote] = useState("");
  const mutation = useMutation();
  const save = status => mutation.run(() => supportRequestApi.update(request.id, { ...(status ? { status } : {}), ...(note.trim() ? { note: note.trim() } : {}) }), () => { setNote(""); reload(); });
  return <><Field label="Ghi chú xử lý" value={note} onChange={setNote} /><ErrorMessage error={mutation.error} /><div className="page-action"><Button disabled={mutation.pending || !note.trim()} onClick={() => save()}>Lưu ghi chú</Button><Button variant="secondary" disabled={mutation.pending} onClick={() => save(request.status === "RESOLVED" ? "PENDING" : "RESOLVED")}>{request.status === "RESOLVED" ? "Mở lại yêu cầu" : "Đánh dấu đã xử lý"}</Button></div></>;
}
export function SupportRequestsPage() {
  const { user } = useApp(); const isMember = user.role === "MEMBER";
  const query = useQuery(async () => ({ requests: await supportRequestApi.list(), members: isMember ? [] : await memberApi.list() }), [isMember]);
  const [message, setMessage] = useState(""); const [memberId, setMemberId] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const mutation = useMutation();
  return <><PageHeader title="Yêu cầu hỗ trợ" subtitle="Gửi yêu cầu và theo dõi lịch sử xử lý tại trung tâm." /><AsyncPanel query={query}>{({ requests, members }) => <>
    <Card><form onSubmit={event => { event.preventDefault(); mutation.run(() => supportRequestApi.create({ message: message.trim(), ...(isMember ? {} : { memberId }) }), () => { setMessage(""); query.reload(); }); }}>
      {!isMember && <SelectField label="Thành viên cần hỗ trợ" value={memberId} onChange={setMemberId}><option value="">Chọn thành viên</option>{members.map(member => <option key={member.id} value={member.id}>{member.name} · {member.phone}</option>)}</SelectField>}
      <label className="field"><span>Nội dung yêu cầu</span><textarea required maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} /></label><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending || !message.trim() || (!isMember && !memberId)}>Gửi yêu cầu</Button>
    </form></Card><div className="form-grid mt"><Field label="Tìm nội dung hoặc thành viên" value={search} onChange={setSearch} /><SelectField label="Trạng thái hỗ trợ" value={status} onChange={setStatus}><option value="">Tất cả</option><option value="PENDING">Chờ xử lý</option><option value="RESOLVED">Đã xử lý</option></SelectField></div>
    {requests.filter(row => (!status || row.status === status) && [row.message, row.memberId?.fullName, row.memberId?.phone, row.id].join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))).map(row => <Card className="mt" key={row.id}><Badge tone={row.status === "RESOLVED" ? "green" : "amber"}>{row.status === "RESOLVED" ? "Đã xử lý" : "Chờ xử lý"}</Badge><h2>{row.memberId?.fullName || "Yêu cầu của bạn"}</h2><p>{row.message}</p><small>{formatters.dateTime(row.createdAt)} · {row.id}</small><div className="stack-list">{(row.handlingNotes || []).map((note, index) => <div key={note._id || index}><span>{note.text}</span><small>{formatters.dateTime(note.createdAt)}</small></div>)}</div>{!isMember && <HandlingForm request={row} reload={query.reload} />}</Card>)}
    {!requests.length && <EmptyState title="Chưa có yêu cầu hỗ trợ" />}
  </>}</AsyncPanel></>;
}
