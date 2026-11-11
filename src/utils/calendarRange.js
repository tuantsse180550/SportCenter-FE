export function calendarRange(period, now = new Date()) {
  const day = new Date(+now + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(day + "T00:00:00Z");
  let end = new Date(start);
  if (period === "WEEK") {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end = new Date(+start + 6 * 86400000);
  } else if (period === "MONTH") {
    start.setUTCDate(1);
    end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  } else if (period !== "TODAY") return { from: "", to: "" };
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
