import { useState } from "react";
import { Button, Field } from "../common/UI.jsx";
import { ErrorMessage } from "../common/AsyncPanel.jsx";
import { subjectApi } from "../../services/api/resources.js";
import { useMutation } from "../../store/useQuery.js";
import "./subject-form.css";

export function SubjectForm({ initial, onSaved, onCancel, onPendingChange, cancelLabel = "Hủy" }) {
  const [name, setName] = useState(initial?.name || "");
  const mutation = useMutation();
  const submit = event => {
    event.preventDefault();
    if (!name.trim()) return;
    mutation.run(async () => {
      onPendingChange?.(true);
      try {
        const payload = { name: name.trim() };
        return initial?.id ? await subjectApi.update(initial.id, payload) : await subjectApi.create(payload);
      } finally { onPendingChange?.(false); }
    }, onSaved);
  };
  return <form className="subject-editor" onSubmit={submit}>
    <fieldset disabled={mutation.pending} className="subject-form-fields">
      <Field label="Tên bộ môn" required value={name} onChange={setName} placeholder="Ví dụ: Cầu lông" />
    </fieldset>
    <ErrorMessage error={mutation.error} />
    <div className="subject-actions">
      <Button variant="secondary" disabled={mutation.pending} onClick={onCancel}>{cancelLabel}</Button>
      <Button type="submit" disabled={mutation.pending || !name.trim()}>{mutation.pending ? "Đang lưu..." : initial?.id ? "Lưu tên bộ môn" : "Thêm bộ môn"}</Button>
    </div>
  </form>;
}
