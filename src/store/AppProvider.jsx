import { noticeText } from "../utils/vietnamese.js";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/common/UI.jsx";
import { authService } from "../services/index.js";
import { session } from "../api/session.js";
import { AppContext } from "./appContext.js";
export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const timer = useRef(null);
  useEffect(() => {
    let active = true;
    let restoreCancelled = false;
    const unsubscribe = session.subscribe(() => {
      restoreCancelled = true;
      if (active) { setUser(null); setAuthError(null); setAuthLoading(false); }
    });
    authService.restore().then((restored) => {
      if (active && !restoreCancelled) { setUser(restored); setAuthLoading(false); setAuthError(null); }
    }, (error) => {
      if (active && !restoreCancelled) { setAuthError(error); setAuthLoading(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, [attempt]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const toast = (message) => { setToastMessage(message); clearTimeout(timer.current); timer.current = setTimeout(() => setToastMessage(""), 3500); };
  const retryAuth = () => { setAuthLoading(true); setAuthError(null); setAttempt((n) => n + 1); };
  return <AppContext.Provider value={{ user, setUser, authLoading, authError, retryAuth, toast }}>{children}{toastMessage && <div className="toast" role="status"><Icon name="check" />{noticeText(toastMessage)}</div>}</AppContext.Provider>;
}
