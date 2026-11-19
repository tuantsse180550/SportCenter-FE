export const PAGE_SIZE = 8;

/** Lowercase, accent-insensitive text match for client-side search. */
export function matches(query, ...values) {
  const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const needle = fold(query.trim());
  return !needle || fold(values.join(' ')).includes(needle);
}

/** Save text as a file in the browser (CSV export). */
export function downloadText(name, content, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿', content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const csvCell = value => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
