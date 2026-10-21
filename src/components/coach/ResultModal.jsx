import { uiLabel } from "../../utils/vietnamese.js";
import { useState } from "react";
import { Button, Field, Modal, SelectField } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { trainingResultService } from "../../services/index.js";
import { useMutation } from "../../store/useQuery.js";
export function ResultModal({ member, plans, onClose, onDone }) {
  const [form, setForm] = useState({ workoutPlanId: "", result: "", comment: "" }); const mutation = useMutation(); const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return <Modal title={"Ghi nhận kết quả - " + member.name} onClose={mutation.pending ? () => {} : onClose} footer={<><Button disabled={mutation.pending} variant="secondary" onClick={onClose}>Hủy</Button><Button disabled={mutation.pending || !form.workoutPlanId || !form.result.trim()} onClick={() => mutation.run(() => trainingResultService.createResult({ ...form, memberId: member.id }), onDone)}>{mutation.pending ? "Đang lưu..." : "Lưu kết quả"}</Button></>}><ErrorMessage error={mutation.error} />{!plans.length && <p>Hãy tạo kế hoạch tập luyện cho thành viên và lớp học này trong mục Kế hoạch tập luyện trước khi ghi nhận kết quả.</p>}<div className="form-grid"><SelectField label="Kế hoạch tập luyện" value={form.workoutPlanId} onChange={(v) => update("workoutPlanId", v)}><option value="">Chọn kế hoạch</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.goal} | {uiLabel(p.status)}</option>)}</SelectField><Field label="Kết quả" value={form.result} onChange={(v) => update("result", v)} /><Field label="Nhận xét của huấn luyện viên" value={form.comment} onChange={(v) => update("comment", v)} /></div><p>Kết quả được gắn với kế hoạch tập luyện. Hệ thống chưa lưu liên kết đến buổi học hoặc điểm đánh giá.</p></Modal>;
}
