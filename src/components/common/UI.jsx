import { initials } from "../../utils/text.js";
import { uiLabel } from "../../utils/vietnamese.js";
import { useEffect, useId, useRef } from "react";

export function Icon({ name, className = "" }) {
  const paths = {
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h4" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 4 3 5-7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    clipboard: <><rect x="4" y="4" width="16" height="18" rx="2" /><path d="M9 4V2h6v2M8 11h8M8 16h6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    invoice: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    spark: <><path d="m12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6L12 3Z" /><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z" /></>,
    swap: <><path d="M17 3l4 4-4 4" /><path d="M3 7h18" /><path d="M7 21l-4-4 4-4" /><path d="M21 17H3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    userplus: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
  };
  return <svg className={["icon", className].filter(Boolean).join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.activity}</svg>;
}

export function Button({ children, variant = "primary", icon, className = "", disabled, type = "button", onClick }) {
  return <button type={type} disabled={disabled} onClick={onClick} className={["btn", variant, className].filter(Boolean).join(" ")}>{icon && <Icon name={icon} />}{children}</button>;
}

export function BackButton({ children, onClick }) {
  return <Button variant="back" onClick={onClick}><span aria-hidden="true">←</span>{children}</Button>;
}

export function Badge({ children, tone = "blue" }) {
  return <span className={"badge " + tone}>{uiLabel(children)}</span>;
}

export function Card({ children, className = "", onClick }) {
  return <div onClick={onClick} className={["card", onClick ? "clickable" : "", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function Field({ label, value, onChange, type = "text", placeholder, required }) {
  const invalid = (event) => {
    const input = event.currentTarget;
    input.setCustomValidity("");
    input.setCustomValidity(input.validity.valueMissing ? "Vui lòng nhập " + label.toLowerCase() + "." : input.validity.typeMismatch && type === "email" ? "Vui lòng nhập địa chỉ email hợp lệ." : "Vui lòng kiểm tra giá trị của " + label.toLowerCase() + ".");
  };
  return <label className="field"><span>{label}</span><input required={required} type={type} value={value} placeholder={placeholder} onInvalid={invalid} onInput={(event) => event.currentTarget.setCustomValidity("")} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function SelectField({ label, value, onChange, children, disabled = false }) {
  return <label className="field"><span>{label}</span><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

export function PageHeader({ title, subtitle, action }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="page-action">{action}</div>}</div>;
}

export function SummaryGrid({ items }) {
  return <div className="summary-grid">{items.map((item) => <button key={item.label} type="button" onClick={item.onClick} className="summary-item"><span>{item.label}</span><strong>{uiLabel(item.value)}</strong>{item.detail && <em>{item.detail}</em>}</button>)}</div>;
}

export function EmptyState({ icon = "search", title, text, action }) {
  return <div className="empty-state"><Icon name={icon} /><strong>{title}</strong>{text && <span>{text}</span>}{action}</div>;
}

export function Modal({ title, children, footer, onClose }) {
  const dialog = useRef(null); const close = useRef(onClose); const titleId = useId();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const trigger = document.activeElement; const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); return; }
      if (event.key !== "Tab") return;
      const items = [...dialog.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']")].filter(el => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.current.focus(); return; }
      if (!dialog.current.contains(document.activeElement) || event.shiftKey && document.activeElement === first) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={onClose}><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="modal" onMouseDown={(event) => event.stopPropagation()}><header><strong id={titleId}>{title}</strong><button type="button" onClick={onClose} aria-label="Đóng"><Icon name="close" /></button></header><div className="modal-body">{children}</div>{footer && <footer>{footer}</footer>}</section></div>;
}

export function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark"><Icon name="activity" /></div><span>Đang tải Sport Center...</span></div>;
}

export function InfoGrid({ items }) {
  return <div className="info-grid">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{(["Trình độ", "Vai trò", "Trạng thái", "Phương thức", "Phương thức thanh toán"].includes(label) ? uiLabel(value) : value) || "Chưa có"}</strong></div>)}</div>;
}

export function AvatarText({ name, sub, large = false }) {
  return <div className={["avatar-text", large ? "large" : ""].filter(Boolean).join(" ")}><span>{initials(name)}</span><div><strong>{name}</strong>{sub && <small>{sub}</small>}</div></div>;
}

export function Progress({ value }) {
  return <div className="progress"><span style={{ width: Math.max(0, Math.min(100, value || 0)) + "%" }} /></div>;
}
