let version = 0;
const listeners = new Set();
export const stateService = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot() { return version; },
  invalidate() { version += 1; listeners.forEach((listener) => listener()); },
};
