import { useRef, useState } from 'react';
import Button from './Button';
import Modal from './Modal';
import { Icon } from './Icon';

/** Button that opens a confirm dialog and runs `onConfirm` (async). Errors stay in the dialog. */
export default function ConfirmButton({ label, title, description, confirmLabel, busyLabel = 'Đang xử lý…', cancelLabel = 'Hủy', onConfirm, onDone, secondary = true, small = true, danger = false, icon }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function run() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await onConfirm(); setOpen(false); onDone?.(); }
    catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <>
      <Button secondary={secondary} small={small} icon={icon} title={label} onPress={() => { setError(''); setOpen(true); }} />
      <Modal open={open} onClose={() => setOpen(false)} locked={busy} title={title}>
        <p className="body">{description}</p>
        {error && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>{error}</p></div>}
        <div className="modal-actions">
          <Button secondary disabled={busy} title={cancelLabel} onPress={() => setOpen(false)} />
          <Button variant={danger ? 'danger' : ''} disabled={busy} title={busy ? busyLabel : confirmLabel} onPress={run} />
        </div>
      </Modal>
    </>
  );
}
