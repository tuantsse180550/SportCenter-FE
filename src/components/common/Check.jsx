/** Checkbox with label. Mobile-style `onPress` toggles. */
export default function Check({ checked, onPress, onChange, label, disabled = false }) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => { onChange?.(event.target.checked); onPress?.(); }}
      />
      <span>{label}</span>
    </label>
  );
}
