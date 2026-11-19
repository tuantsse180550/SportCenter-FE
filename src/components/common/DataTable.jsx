import { Icon } from './Icon';

/** Design table toolbar: search field + optional filter select. options: [{ value, label }] */
export function TableToolbar({ search, onSearch, placeholder = 'Tìm kiếm…', filter, onFilter, options, children }) {
  return (
    <div className="table-toolbar">
      <label className="search-field">
        <Icon name="search" size={18} />
        <input placeholder={placeholder} value={search} onChange={event => onSearch(event.target.value)} aria-label={placeholder} />
      </label>
      {(options || children) && (
        <div className="toolbar-right">
          {children}
          {options && (
            <>
              <Icon name="filter" size={17} />
              <select value={filter} onChange={event => onFilter(event.target.value)} aria-label="Bộ lọc">
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Design pagination bar for a usePaged() result. */
export function Pagination({ paged }) {
  const { page, pages, size, total, setPage } = paged;
  const first = Math.max(1, Math.min(page - 1, pages - 3));
  const numbers = Array.from({ length: Math.min(pages, 4) }, (_, index) => first + index);
  return (
    <div className="pagination">
      <span>Hiển thị {total ? (page - 1) * size + 1 : 0}–{Math.min(page * size, total)} trên {total} kết quả</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước"><Icon name="left" size={16} /></button>
        {numbers.map(number => (
          <button type="button" key={number} className={page === number ? 'selected' : ''} onClick={() => setPage(number)}>{number}</button>
        ))}
        {numbers.at(-1) < pages && <span>… {pages}</span>}
        <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Trang sau"><Icon name="right" size={16} /></button>
      </div>
    </div>
  );
}
