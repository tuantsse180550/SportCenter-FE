import { currency } from '../../api/payments';

const short = value => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}tr` : value >= 1e3 ? `${Math.round(value / 1e3)}k` : String(value));

/** Design bar chart. bars: [{ label, value, title? }] — values in VND by default. */
export default function BarChart({ bars, large = false, format = currency, onSelect }) {
  const max = Math.max(...bars.map(bar => bar.value), 1);
  return (
    <div className={`bar-chart ${large ? 'large' : ''}`}>
      <div className="chart-y">
        <span>{short(max)}</span>
        <span>{short(Math.round(max / 2))}</span>
        <span>0</span>
      </div>
      <div className="chart-bars">
        {bars.map(bar => (
          <div className="bar-group" key={bar.label}>
            <button type="button" title={bar.title || `${bar.label}: ${format(bar.value)}`} aria-label={bar.title || `${bar.label}: ${format(bar.value)}`}
              style={{ height: `${Math.max(3, (bar.value / max) * 100)}%` }} onClick={() => onSelect?.(bar)}>
              <span>{format(bar.value)}</span>
            </button>
            <small>{bar.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
