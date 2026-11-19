import { useEffect, useId } from 'react';
import { Icon } from './Icon';

/** Design modal: overlay + header (eyebrow, title, close) + scrollable body. Escape/backdrop close unless `locked`. */
export default function Modal({ open, onClose, title, children, locked = false, wide = false }) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape' && !locked) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !locked) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal${wide ? ' wide' : ''}`}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">ACTIVEHUB WORKSPACE</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Đóng" disabled={locked} onClick={onClose}><Icon name="close" size={21} /></button>
        </div>
        <div className="modal-body stack-sm">{children}</div>
      </section>
    </div>
  );
}
