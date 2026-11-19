// The receipt endpoint returns HTML. Extract only table text; never render server markup.
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = value => value.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name) => entities[name] || '').trim();

/** → [[label, value], …] */
export function receiptRows(html) {
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), row => Array.from(row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), cell => decode(cell[1])))
    .filter(row => row.length === 2);
  if (!rows.length) throw new Error('Không đọc được nội dung biên nhận. Vui lòng thử lại.');
  return rows;
}
