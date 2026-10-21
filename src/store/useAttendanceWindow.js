import { useEffect, useState } from "react";
import { attendanceWindow } from "../utils/attendanceWindow.js";

export function useAttendanceWindow(session) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return attendanceWindow(session, now);
}
