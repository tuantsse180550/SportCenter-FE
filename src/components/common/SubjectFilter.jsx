import { subjectTone } from '../../utils/subject-filter';

/**
 * Sport filter chips: "Tất cả (12) · Bóng bàn (5) · Yoga (7)". Hidden when the list has one sport or less.
 * options: [{ id, name, count }] from subjectCounts(); value '' = all, '-' = records with no known sport.
 */
export default function SubjectFilter({ options, value, onChange, total }) {
  if (options.filter(item => item.id).length < 2 && !value) return null;
  const ids = options.map(item => item.id);
  return (
    <div className="subject-filter" role="group" aria-label="Lọc theo môn">
      <span className="subject-filter-label">Môn</span>
      <button type="button" className={value === '' ? 'active' : ''} aria-pressed={value === ''} onClick={() => onChange('')}>
        Tất cả <small>{total}</small>
      </button>
      {options.map(item => {
        const key = item.id || '-';
        return (
          <button type="button" key={key} className={value === key ? 'active' : ''} aria-pressed={value === key} onClick={() => onChange(value === key ? '' : key)}>
            <i className={`subject-dot ${subjectTone(item.id, ids)}`} />{item.name} <small>{item.count}</small>
          </button>
        );
      })}
    </div>
  );
}
