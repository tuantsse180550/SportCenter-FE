import { useState } from 'react';
import { PAGE_SIZE } from '../utils/table';

/** Client-side paging; the page resets when `resetKey` (e.g. search + filter) changes. */
export function usePaged(rows, resetKey = '', size = PAGE_SIZE) {
  const [state, setState] = useState({ page: 1, key: resetKey });
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = state.key === resetKey ? Math.min(state.page, pages) : 1;
  return {
    page,
    pages,
    size,
    total: rows.length,
    visible: rows.slice((page - 1) * size, page * size),
    setPage: next => setState({ page: next, key: resetKey }),
  };
}
