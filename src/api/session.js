const KEY = "sportcenter.accessToken";
let memoryToken = null;
const listeners = new Set();
export const session = {
  getToken() { try { return globalThis.sessionStorage?.getItem(KEY) || memoryToken; } catch { return memoryToken; } },
  setToken(token) { memoryToken = token; try { if (token) globalThis.sessionStorage?.setItem(KEY, token); else globalThis.sessionStorage?.removeItem(KEY); } catch { /* In-memory session remains usable when storage is unavailable. */ } },
  clear() { this.setToken(null); listeners.forEach((listener) => listener()); },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
};
