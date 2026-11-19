// HTTP client shared by every API module. Port of mobile services/api.ts.
// BE envelope: { success, message, data, requiresOTP? }.

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// AuthContext subscribes here so a 401 on the current token ends the session.
const unauthorizedListeners = new Set();
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}
function notifyUnauthorized(token) {
  unauthorizedListeners.forEach(listener => listener(token));
}

/**
 * @param {string} path  e.g. '/api/classes'
 * @param {{ method?: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', body?: unknown, formData?: FormData, token?: string, timeoutMs?: number, statusMessages?: Record<number, string> }} [options]
 * @returns {Promise<{ success: boolean, message?: string, data?: any, requiresOTP?: boolean }>}
 */
export async function requestEnvelope(path, options = {}) {
  const { body, formData, token, timeoutMs = TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { Accept: 'application/json' };
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || (body === undefined && !formData ? 'GET' : 'POST'),
      headers,
      body: formData || (body === undefined ? undefined : JSON.stringify(body)),
      signal: controller.signal,
    });
    if (response.status === 401 && token) notifyUnauthorized(token);
    if (response.status === 204 && response.ok) return { success: true };
    let result;
    if (!response.ok && options.statusMessages?.[response.status]) { throw new ApiError(options.statusMessages[response.status], response.status); }
    try { result = await response.json(); }
    catch { throw new ApiError(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}).`, response.status); }
    if (!response.ok || !result || result.success !== true) {
      throw new ApiError(result?.message || `Yêu cầu thất bại (HTTP ${response.status}).`, response.status);
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Kết nối quá thời gian. Vui lòng thử lại.');
    if (error instanceof TypeError) throw new Error('Không kết nối được backend. Kiểm tra địa chỉ API và kết nối mạng.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Same as requestEnvelope but returns only `data`. */
export async function request(path, options = {}) {
  return (await requestEnvelope(path, options)).data;
}

/** Authenticated file download (e.g. Excel template) → Blob. */
export async function requestBlob(path, token, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (response.status === 401) notifyUnauthorized(token);
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new ApiError(options.statusMessages?.[response.status] || result?.message || `Không tải được tệp (HTTP ${response.status}).`, response.status);
    }
    return await response.blob();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Kết nối quá thời gian. Vui lòng thử lại.');
    if (error instanceof TypeError) throw new Error('Không kết nối được backend. Kiểm tra địa chỉ API và kết nối mạng.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** For endpoints that return HTML (payment receipt). */
export async function requestHtml(path, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'text/html', Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (response.status === 401) notifyUnauthorized(token);
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new ApiError(result?.message || `Không tải được biên nhận (HTTP ${response.status}).`, response.status);
    }
    if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('Biên nhận từ máy chủ không hợp lệ.');
    return await response.text();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Kết nối quá thời gian. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const enc = encodeURIComponent;
