import { session } from "./session.js";
import { stateService } from "./apiEvents.js";
export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null } = {}) {
    super(message); this.name = "ApiError"; this.status = status; this.code = code; this.details = details;
  }
}
export function createApiClient({ baseUrl, fetchImpl = (...args) => fetch(...args), tokenStore = session, onMutation = () => stateService.invalidate(), timeoutMs = 30000 } = {}) {
  const pendingReads = new Map();
  let revision = 0;
  const invalidateReads = () => { revision += 1; pendingReads.clear(); };
  tokenStore.subscribe?.(invalidateReads);
  async function send(path, { method = "GET", body, authenticated = true, signal, responseType = "json" } = {}) {
    if (!baseUrl?.trim()) throw new ApiError("VITE_API_BASE_URL is not configured.", { code: "CONFIGURATION" });
    if (!path.startsWith("/api/")) throw new ApiError("Invalid API path.");
    const token = authenticated ? tokenStore.getToken() : null;
    if (authenticated && !token) throw new ApiError("Please sign in to continue.", { status: 401, code: "UNAUTHORIZED" });
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, timeoutMs);
    const multipart = typeof FormData !== "undefined" && body instanceof FormData;
    try {
      const response = await fetchImpl(baseUrl.trim().replace(/\/+$/, "") + path, {
        method, signal: controller.signal,
        headers: { Accept: responseType === "html" ? "text/html, application/json" : "application/json", ...(body !== undefined && !multipart ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
      });
      if (authenticated && token !== tokenStore.getToken()) throw new ApiError("Session changed. Please retry.", { code: "SESSION_CHANGED" });
      if (response.status === 401 && authenticated) tokenStore.clear();
      const text = await response.text();
      // Reading the body is asynchronous too: a logout/login may happen here.
      if (authenticated && response.status !== 401 && token !== tokenStore.getToken()) throw new ApiError("Session changed. Please retry.", { code: "SESSION_CHANGED" });
      // The existing receipt endpoint returns HTML, while errors still use JSON.
      if (response.ok && responseType === "html") {
        if (!response.headers?.get("content-type")?.toLowerCase().includes("text/html") || !text.trim()) {
          throw new ApiError("The server returned an invalid receipt.", { status: response.status, code: "INVALID_RESPONSE" });
        }
        return text;
      }
      let envelope;
      try { envelope = text ? JSON.parse(text) : {}; } catch { throw new ApiError("The server returned an invalid response.", { status: response.status, code: "INVALID_RESPONSE" }); }
      if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new ApiError("The server returned an invalid response envelope.", { status: response.status, code: "INVALID_RESPONSE" });
      if (!response.ok || envelope.success === false) throw new ApiError(envelope.message || (response.status === 403 ? "You do not have permission for this action." : "Request failed."), { status: response.status, code: response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : "API_ERROR", details: envelope.errors || envelope.error || null });
      if (method !== "DELETE" && !Object.hasOwn(envelope, "data")) throw new ApiError("The server response is missing data.", { status: response.status, code: "INVALID_RESPONSE" });
      if (method !== "GET") { invalidateReads(); onMutation(); }
      return envelope.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.name === "AbortError" ? "Request timed out or was cancelled. Please retry." : "Cannot reach the server. Check your connection and retry.", { code: error.name === "AbortError" ? "ABORTED" : "NETWORK" });
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
  return function request(path, options = {}) {
    // Share only overlapping reads. No persisted data cache or fallback to stale data.
    // Requests with caller-owned signals remain independent to preserve cancellation.
    if ((options.method || "GET") !== "GET" || options.signal || options.body !== undefined) return send(path, options);
    const key = JSON.stringify([path, options.responseType || "json", options.authenticated !== false, options.authenticated === false ? null : tokenStore.getToken(), revision]);
    if (pendingReads.has(key)) return pendingReads.get(key);
    const pending = send(path, options);
    pendingReads.set(key, pending);
    const cleanup = () => { if (pendingReads.get(key) === pending) pendingReads.delete(key); };
    pending.then(cleanup, cleanup);
    return pending;
  };
}
export const apiClient = createApiClient({ baseUrl: import.meta.env?.VITE_API_BASE_URL ?? import.meta.env?.VITE_API_URL });
