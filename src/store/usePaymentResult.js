import { useEffect, useState } from "react";
import { paymentService } from "../services/index.js";
import { vnpayQueryFromSearch } from "../services/api/paymentStatus.js";

const initial = { data: null, error: null, loading: true };

export function usePaymentResult(paymentId, enabled, userId, search = "") {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, ...initial });
  const key = JSON.stringify([paymentId, enabled, userId, search, attempt]);
  useEffect(() => {
    if (!enabled || !paymentId) return;
    const abort = new AbortController();
    let disposed = false;
    let timer;
    const deadline = Date.now() + 30000;
    async function check(verifiedData = null) {
      let data;
      try {
        // Verification already returns committed status; avoid another round trip.
        data = verifiedData || await paymentService.getPaymentStatus(paymentId, { signal: abort.signal });
        if (disposed) return;
        const polling = data.status === "PENDING" && Date.now() < deadline;
        setResult({ key, data, error: null, loading: false, polling, receiptLoading: data.status === "SUCCESS" });
        if (polling) timer = setTimeout(check, Math.min(3000, deadline - Date.now()));
        if (data.status === "SUCCESS") {
          try {
            const receipt = await paymentService.getPaymentReceipt(paymentId, { signal: abort.signal });
            if (!disposed) setResult({ key, data: { ...data, receipt }, error: null, loading: false });
          } catch (receiptError) {
            if (!disposed) setResult({ key, data, receiptError, error: null, loading: false });
          }
        }
      } catch (error) {
        // A failed read cannot establish or change a payment status.
        if (!disposed) setResult({ key, data: null, error, loading: false });
      }
    }
    async function verifyAndCheck() {
      try {
        const query = vnpayQueryFromSearch(search);
        const verifiedData = query ? await paymentService.verifyVnpayReturn(query, { signal: abort.signal }) : null;
        if (!disposed) await check(verifiedData);
      } catch (error) {
        if (!disposed) setResult({ key, data: null, error, loading: false });
      }
    }
    verifyAndCheck();
    return () => { disposed = true; clearTimeout(timer); abort.abort(); };
  }, [paymentId, enabled, search, key]);
  return { ...(result.key === key ? result : initial), reload: () => setAttempt(value => value + 1) };
}
