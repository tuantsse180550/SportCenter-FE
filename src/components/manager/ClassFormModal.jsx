import { useState } from "react";
import { Button, Field, Modal, SelectField } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { useMutation } from "../../store/useQuery.js";
export function ClassFormModal({ title, options, initial, onClose, onSubmit, onDone }) {
  const [form, setForm] = useState(() => ({ name: initial?.name || "", subjectId: initial?.subjectId || "", courseId: initial?.courseId || "", coachId: initial?.coachId || "" }));
  const mutation = useMutation(); const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return <Modal title={title} onClose={mutation.pending ? () => {} : onClose} footer={<><Button disabled={mutation.pending} variant="secondary" onClick={onClose}>Hủy</Button><Button disabled={mutation.pending || !form.name.trim() || !form.subjectId || !form.courseId || !form.coachId} onClick={() => mutation.run(() => onSubmit(form), onDone)}>{mutation.pending ? "Đang lưu..." : "Lưu"}</Button></>}><ErrorMessage error={mutation.error} /><div className="form-grid"><Field label="Tên lớp học" value={form.name} onChange={(v) => update("name", v)} />{[["subjectId", "Bộ môn", options.subjects], ["courseId", "Khóa học", options.courses], ["coachId", "Huấn luyện viên", options.coaches]].map(([key, label, rows]) => <SelectField key={key} label={label} value={form[key]} onChange={(v) => update(key, v)}><option value="">Chọn {label.toLowerCase()}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectField>)}</div><p>Mỗi huấn luyện viên chỉ được phân công một lớp. Hệ thống chưa hỗ trợ sức chứa, phòng học và trạng thái hoạt động của lớp.</p></Modal>;
}
