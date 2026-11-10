import { useState } from "react";
import { Button, Modal, SelectField } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { useMutation } from "../../store/useQuery.js";
import { coachApi } from "../../services/api/resources.js";

function SpecialtyForm({ coach, subjects, onDone, onPendingChange }) {
  const [subjectId, setSubjectId] = useState(coach.subjectIds?.[0] || "");
  const mutation = useMutation();
  const submit = event => {
    event.preventDefault();
    if (!subjects.some(subject => subject.id === subjectId)) return;
    onPendingChange(true);
    mutation.run(() => coachApi.update(coach.id, { subjectIds: [subjectId] }), onDone).finally(() => onPendingChange(false));
  };
  return <form onSubmit={submit} className="form-grid">
    {!coach.subjectIds?.length && <p>HLV chưa khai báo chuyên môn, chưa thể được phân công lớp mới.</p>}
    <SelectField label="Chuyên môn" disabled={mutation.pending} value={subjectId} onChange={setSubjectId}>
      <option value="">Chọn một bộ môn</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
    </SelectField>
    <p>Mỗi HLV có một chuyên môn. Nếu đang phụ trách lớp, chuyên môn phải trùng bộ môn của lớp đó.</p>
    <ErrorMessage error={mutation.error} />
    <Button type="submit" disabled={mutation.pending || !subjects.some(subject => subject.id === subjectId)}>{mutation.pending ? "Đang lưu..." : "Lưu chuyên môn"}</Button>
  </form>;
}

export function CoachSpecialtyModal({ options, initialCoachId = "", onClose, onDone }) {
  const [coachId, setCoachId] = useState(initialCoachId);
  const [pending, setPending] = useState(false);
  const coach = options.coaches.find(item => item.id === coachId);
  return <Modal title="Chuyên môn huấn luyện viên" onClose={pending ? () => {} : onClose}>
    <SelectField label="Huấn luyện viên" disabled={pending} value={coachId} onChange={setCoachId}>
      <option value="">Chọn huấn luyện viên</option>{options.coaches.map(item => <option key={item.id} value={item.id}>{item.name}{!item.subjectIds?.length ? " · Chưa khai báo" : ""}</option>)}
    </SelectField>
    {coach && <SpecialtyForm key={coach.id} coach={coach} subjects={options.subjects} onDone={onDone} onPendingChange={setPending} />}
  </Modal>;
}
