import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { stateService } from "../services/index.js";
export function useQuery(load, dependencies = []) {
  const version = useSyncExternalStore(stateService.subscribe, stateService.getSnapshot, stateService.getSnapshot);
  const key = JSON.stringify(dependencies);
  const loader = useRef(load);
  useEffect(() => { loader.current = load; });
  const [result, setResult] = useState({ key: null, data: null, error: null, loading: true });
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => loader.current()).then((data) => { if (active) setResult({ key, data, error: null, loading: false }); }, (error) => { if (active) setResult({ key, data: null, error, loading: false }); });
    return () => { active = false; };
  }, [key, version]);
  return { ...(result.key === key ? result : { data: null, error: null, loading: true }), reload: stateService.invalidate };
}
export function useMutation() {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  async function run(action, onSuccess) {
    if (locked.current) return;
    locked.current = true; setPending(true); setError(null);
    try { const result = await action(); onSuccess?.(result); return result; }
    catch (failure) { setError(failure); }
    finally { locked.current = false; setPending(false); }
  }
  return { run, pending, error };
}
