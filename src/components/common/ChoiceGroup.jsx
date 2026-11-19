import { useId } from 'react';

/**
 * Single choice. Short option sets render as the design's segmented control,
 * longer ones as selectable chips. options: [{ value, label }]
 */
export default function ChoiceGroup({ label, options, value, onChange, disabled = false, error }) {
  const name = useId();
  const segmented = options.length <= 4 && options.every(option => String(option.label).length <= 22);
  return (
    <fieldset className="choice-group" disabled={disabled}>
      {label && <legend>{label}</legend>}
      {segmented ? (
        <div className="segmented" role="radiogroup" aria-label={label}>
          {options.map(option => (
            <button key={option.value} type="button" role="radio" aria-checked={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="choice-list">
          {options.map(option => (
            <label key={option.value} className={`choice${value === option.value ? ' is-selected' : ''}`}>
              <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </fieldset>
  );
}
