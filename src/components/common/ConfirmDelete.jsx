import { Button, Card, Modal } from "./UI.jsx";
import { ErrorMessage } from "./AsyncPanel.jsx";
import { useMutation } from "../../store/useQuery.js";

export function ConfirmDelete({ title, name, children, onDelete, onClose, onDeleted, onPendingChange, inline = false }) {
  const mutation = useMutation();
  const confirm = () => mutation.run(async () => {
    onPendingChange?.(true);
    try { return await onDelete(); }
    finally { onPendingChange?.(false); }
  }, onDeleted);
  const content = <>
    {inline && <h3>{title}</h3>}
    <p>Bạn có chắc muốn xóa <strong>“{name}”</strong>? Thao tác này không thể hoàn tác.</p>
    {children}
    <ErrorMessage error={mutation.error} />
    <div className="delete-actions">
      <Button variant="secondary" disabled={mutation.pending} onClick={onClose}>Hủy</Button>
      <Button variant="danger" disabled={mutation.pending} onClick={confirm}>{mutation.pending ? "Đang xóa..." : "Xác nhận xóa"}</Button>
    </div>
  </>;
  return inline ? <Card className="delete-confirmation">{content}</Card> :
    <Modal title={title} onClose={mutation.pending ? () => {} : onClose}>{content}</Modal>;
}
