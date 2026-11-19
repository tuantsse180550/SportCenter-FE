import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';

/**
 * Runs `loader` when enabled and on reload(). `loader` must be memoised (useCallback).
 * → { data, error, loading, reload, missing (HTTP 404) }
 */
export function useApiQuery(loader, enabled = true) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState(null);
  const reload = useCallback(() => setVersion(current => current + 1), []);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    Promise.resolve()
      .then(() => (active ? loader() : undefined))
      .then(data => { if (active) setState({ loader, version, data, error: null }); })
      .catch(error => {
        if (active) setState({ loader, version, data: null, error: error instanceof Error ? error : new Error('Yêu cầu thất bại.') });
      });
    return () => { active = false; };
  }, [loader, enabled, version]);

  // Ignore results from an older loader/version so stale data is never shown.
  const current = enabled && state?.loader === loader && state.version === version ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: enabled && !current,
    reload,
    missing: current?.error instanceof ApiError && current.error.status === 404,
  };
}
