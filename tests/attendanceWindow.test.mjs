import test from "node:test";
import assert from "node:assert/strict";
import { attendanceWindow } from "../src/utils/attendanceWindow.js";
const session = { date: "2026-10-19", startTime: "18:00", endTime: "19:00", status: "SCHEDULED" };
test("Attendance window uses Vietnam time and locks before/at end, opening exactly at start", () => {
  assert.equal(attendanceWindow(session, Date.parse("2026-10-18T18:30:00+07:00")).code, "ATTENDANCE_NOT_STARTED");
  assert.equal(attendanceWindow(session, Date.parse("2026-10-19T17:59:59+07:00")).allowed, false);
  assert.equal(attendanceWindow(session, Date.parse("2026-10-19T11:00:00Z")).allowed, true);
  assert.equal(attendanceWindow(session, Date.parse("2026-10-19T11:59:59Z")).allowed, true);
  assert.equal(attendanceWindow(session, Date.parse("2026-10-19T12:00:00Z")).code, "ATTENDANCE_ENDED");
  assert.equal(attendanceWindow(session, Date.parse("2026-10-20T00:00:00Z")).allowed, false);
});
test("Cancelled, missing and malformed schedule dates/times cannot enable attendance", () => {
  const now = Date.parse("2026-10-19T11:30:00Z");
  assert.equal(attendanceWindow({ ...session, status: "CANCELLED" }, now).code, "ATTENDANCE_CANCELLED");
  for (const changes of [{ date: undefined }, { date: "2026-02-30" }, { startTime: "25:00" }, { endTime: "18:00" }, { endTime: undefined }]) assert.equal(attendanceWindow({ ...session, ...changes }, now).code, "ATTENDANCE_INVALID_TIME");
});
