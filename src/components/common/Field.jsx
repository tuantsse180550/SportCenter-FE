import { useId, useState } from 'react';

/**
 * Design form field (.field): label + input/textarea + hint/error.
 * Mobile-style props work too: onChangeText(value), editable.
 */
export default function Field({ label, error, hint, password = false, multiline = false, type = 'text', onChangeText, onChange, editable = true, disabled = false, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  const inputProps = {
    id,
    disabled: disabled || !editable,
    'aria-invalid': !!error,
    'aria-describedby': describedBy,
    onChange: event => { onChange?.(event); onChangeText?.(event.target.value); },
    ...props,
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={4} {...inputProps} />
        : password ? (
          <div className="input-wrap">
            <input type={visible ? 'text' : 'password'} {...inputProps} />
            <button type="button" className="input-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? 'Ẩn' : 'Hiện'}</button>
          </div>
        ) : <input type={type} {...inputProps} />}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small id={`${id}-error`} className="field-error">{error}</small>}
    </div>
  );
}
