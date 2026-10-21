import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, EmptyState, Field, SelectField, Modal, PageHeader, Badge, InfoGrid } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { roomApi } from "../../services/api/resources.js";

function RoomForm({ initial, onClose }) {
  const [form, setForm] = useState(initial || { roomNumber: "", name: "", capacity: "", status: "ACTIVE" });
  const mutation = useMutation();
  const set = key => value => setForm(old => ({ ...old, [key]: value }));
  const submit = event => {
    event.preventDefault();
    mutation.run(async () => {
      if (!form.roomNumber.trim() || !Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) throw new Error("Mã phòng và sức chứa nguyên dương là bắt buộc.");
      const payload = { ...form, roomNumber: form.roomNumber.trim(), capacity: Number(form.capacity) };
      return initial ? roomApi.update(initial.id, payload) : roomApi.create(payload);
    }, onClose);
  };
  return <Modal title={initial ? "Sửa phòng" : "Thêm phòng"} onClose={mutation.pending ? () => {} : onClose}><form onSubmit={submit} className="form-grid"><Field label="Mã phòng" required value={form.roomNumber} onChange={set("roomNumber")} /><Field label="Tên phòng" value={form.name} onChange={set("name")} /><Field label="Sức chứa" required type="number" value={form.capacity} onChange={set("capacity")} /><SelectField label="Trạng thái" value={form.status} onChange={set("status")}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></SelectField><ErrorMessage error={mutation.error} /><Button type="submit" disabled={mutation.pending}>{mutation.pending ? "Đang lưu..." : "Lưu phòng"}</Button></form></Modal>;
}

export function ManagerRoomsPage() {
  const { roomId } = useParams(); const navigate = useNavigate(); const [editing, setEditing] = useState(null);
  const query = useQuery(() => roomId ? roomApi.get(roomId) : roomApi.list(), [roomId]);
  const [deleting, setDeleting] = useState(false); const mutation = useMutation();
  return <><PageHeader title={roomId ? "Chi tiết phòng" : "Quản lý phòng"} subtitle="Phòng được phân công cho từng buổi học." action={!roomId && <Button onClick={() => setEditing({})}>Thêm phòng</Button>} /><AsyncPanel query={query}>{data => roomId ? <Card><InfoGrid items={[["Mã phòng", data.roomNumber], ["Tên phòng", data.name], ["Sức chứa", data.capacity], ["Trạng thái", data.status]]} /><BackButton onClick={() => navigate("/manager/rooms")}>Danh sách phòng</BackButton><Button onClick={() => setEditing(data)}>Sửa phòng</Button><Button variant="secondary" onClick={() => setDeleting(true)}>Xóa phòng</Button></Card> : <Card>{data.length ? <div className="stack-list">{data.map(room => <div key={room.id}><div><strong>{room.roomNumber} · {room.name}</strong><p>Sức chứa: {room.capacity}</p><Badge>{room.status}</Badge></div><Button onClick={() => navigate("/manager/rooms/" + room.id)}>Chi tiết</Button></div>)}</div> : <EmptyState title="Chưa có phòng" text="Thêm phòng để phân công lịch học." />}</Card>}</AsyncPanel>{editing && <RoomForm key={editing.id || "new"} initial={editing.id ? editing : null} onClose={() => setEditing(null)} />}{deleting && <Modal title="Xóa phòng?" onClose={() => !mutation.pending && setDeleting(false)}><p>BE sẽ từ chối xóa phòng đã được lịch học tham chiếu.</p><ErrorMessage error={mutation.error} /><Button disabled={mutation.pending} onClick={() => mutation.run(() => roomApi.remove(roomId), () => { setDeleting(false); navigate("/manager/rooms"); })}>Xác nhận xóa</Button></Modal>}</>;
}
