import { useCallback, useState } from 'react';
import { request } from '../../api/client';
import { entityId, referenceLabel } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import { search as matches } from '../../utils/url';
import Button from './Button';
import Field from './Field';
import Modal from './Modal';
import QueryStatus from './QueryStatus';

const titleOf = item => String(item.name || item.title || item.fullName || (item.courseId ? referenceLabel(item.courseId) : entityId(item)));

/**
 * Picks a record from `path` (e.g. '/api/classes') in a searchable dialog.
 * value = selected id. Optional: filter(item), transformItems(rows), onSelect(item).
 */
export default function RelationField({ label, path, token, value, onChange, disabled, error, initialLabel, filter, onSelect, optional, transformItems }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const load = useCallback(() => request(path, { token }), [path, token]);
  const result = useApiQuery(load, open);
  const rows = transformItems ? transformItems(result.data || []) : result.data || [];
  const items = rows.filter(item => !filter || filter(item)).filter(item => matches(`${titleOf(item)} ${entityId(item)}`, query));
  const current = (value && (selectedLabel || initialLabel)) || (value ? 'Đã chọn · đổi lựa chọn' : `Chọn ${label.toLowerCase()}`);

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="row-actions">
        <Button secondary className="relation-button" title={current} disabled={disabled} onPress={() => setOpen(true)} />
        {optional && value && <Button secondary small title="Bỏ chọn" disabled={disabled} onPress={() => { onChange(''); setSelectedLabel(''); }} />}
      </div>
      {error && <p className="error">{error}</p>}
      <Modal open={open} onClose={() => setOpen(false)} title={`Chọn ${label.toLowerCase()}`} wide>
        <Field label="Tìm kiếm" value={query} onChangeText={setQuery} autoFocus />
        <QueryStatus loading={result.loading} error={result.error} retry={result.reload} />
        {!result.loading && !result.error && !items.length && <p className="body">Chưa có dữ liệu phù hợp. Tạo bản ghi liên quan trước.</p>}
        <ul className="pick-list">
          {items.map(item => (
            <li key={entityId(item)}>
              <button
                type="button"
                className={`pick-item${entityId(item) === value ? ' is-selected' : ''}`}
                onClick={() => { onChange(entityId(item)); setSelectedLabel(titleOf(item)); onSelect?.(item); setOpen(false); }}
              >
                <strong>{titleOf(item)}</strong>
                <small>{entityId(item)}</small>
              </button>
            </li>
          ))}
        </ul>
        <Button secondary title="Đóng" onPress={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
