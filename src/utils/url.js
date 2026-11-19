/** Builds '/path?key=value' skipping empty params. */
export function withQuery(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ).toString();
  return query ? `${path}?${query}` : path;
}

/** Shortcut for the generic resource list: /workspace/:resource?… */
export const workspacePath = (resource, params) => withQuery(`/workspace/${resource}`, params);
export const workspaceEditPath = (resource, params) => withQuery(`/workspace/${resource}/edit`, params);

/** Asia/Bangkok (UTC+7) calendar date, YYYY-MM-DD. */
export function bangkokDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
}

export function bangkokTime(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
}

export const search = (text, query) => String(text).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
