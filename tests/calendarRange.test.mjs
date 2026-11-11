import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarRange } from "../src/utils/calendarRange.js";
test("Schedule week uses Monday through Sunday in Vietnam", () => {
  assert.deepEqual(calendarRange("WEEK", new Date("2026-11-11T02:00:00Z")), { from: "2026-11-09", to: "2026-11-15" });
});
test("Month/day filters handle Vietnam midnight and calendar month boundaries", () => {
  const now = new Date("2026-10-31T18:00:00Z");
  assert.deepEqual(calendarRange("TODAY", now), { from: "2026-11-01", to: "2026-11-01" });
  assert.deepEqual(calendarRange("MONTH", now), { from: "2026-11-01", to: "2026-11-30" });
});
