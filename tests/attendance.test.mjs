import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";
import { matchesAttendanceSession, sessionAttendanceKey } from "../src/services/api/attendanceIdentity.js";
test("Attendance identity uses class, lesson and exact instant across timezone offsets", () => {
 const session = { classId: "class", lessonId: "lesson", dateTime: "2026-10-10T10:00:00Z", date: "2026-10-10" };
 assert.equal(matchesAttendanceSession({ ...session, dateTime: "2026-10-10T17:00:00+07:00" }, session), true);
 for (const change of [{ classId: "another" }, { lessonId: "another" }, { dateTime: "2026-10-10T00:00:00Z" }, { dateTime: "2026-10-11T10:00:00Z" }]) assert.equal(matchesAttendanceSession({ ...session, ...change }, session), false);
 assert.equal(sessionAttendanceKey({ ...session, dateTime: "invalid" }), null);
 assert.equal(matchesAttendanceSession({}, {}), false);
});
test("Attendance workflow uses existing CRUD and blocks unsafe Member reads (fixture only)", async t => {
 t.mock.method(Date, "now", () => Date.parse("2026-10-10T11:30:00Z"));
 const fixture = createBackendFixture(); const prior = globalThis.fetch; globalThis.fetch = fixture.fetch;
 const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
 try {
  const services = await server.ssrLoadModule("/src/services/index.js");
  const login = role => services.authService.login({ email: role.toLowerCase() + "@test.invalid", password: "test-password" });
  fixture.state.registrations.push({ _id: "reg", classId: fixture.ids.class, memberId: fixture.ids.member, status: "CONFIRMED" });
  await login("COACH");
  let detail = await services.scheduleService.getSessionDetail(fixture.ids.schedule);
  await t.test("out-of-hours create/update/delete are blocked before any API request", async () => {
   const before = fixture.calls.length;
   const future = { ...detail, date: "2026-10-11" };
   await assert.rejects(services.attendanceService.saveAttendance(future, { [fixture.ids.member]: "PRESENT" }), e => e.code === "ATTENDANCE_NOT_STARTED");
   await assert.rejects(services.attendanceService.deleteAttendance(future, fixture.ids.member), e => e.code === "ATTENDANCE_NOT_STARTED");
   await assert.rejects(services.attendanceService.saveAttendance({ ...detail, status: "CANCELLED" }, { [fixture.ids.member]: "PRESENT" }), e => e.code === "ATTENDANCE_CANCELLED");
   await assert.rejects(services.attendanceService.saveAttendance({ ...detail, endTime: "18:15" }, { [fixture.ids.member]: "ABSENT" }), e => e.code === "ATTENDANCE_ENDED");
   assert.equal(fixture.calls.length, before);
  });
  await t.test("session ending during attendance read prevents the subsequent write", async child => {
   let now = Date.parse("2026-10-10T11:59:59Z");
   child.mock.method(Date, "now", () => now);
   const before = fixture.calls.length;
   globalThis.fetch = async (url, options) => {
    const response = await fixture.fetch(url, options);
    if (new URL(url).pathname.startsWith("/api/attendances/schedule/")) now = Date.parse("2026-10-10T12:00:00Z");
    return response;
   };
   try { await assert.rejects(services.attendanceService.saveAttendance(detail, { [fixture.ids.member]: "PRESENT" }), e => e.code === "ATTENDANCE_ENDED"); }
   finally { globalThis.fetch = fixture.fetch; }
   assert.equal(fixture.calls.slice(before).some(c => c.method !== "GET"), false);
  });
  await t.test("create, read, update and delete retain payload identity", async () => {
   await services.attendanceService.saveAttendance(detail, { [fixture.ids.member]: "PRESENT" });
   detail = await services.scheduleService.getSessionDetail(fixture.ids.schedule);
   assert.equal(detail.attendance[0].status, "PRESENT");
   await services.attendanceService.saveAttendance(detail, { [fixture.ids.member]: "ABSENT" });
   assert.equal(fixture.state.attendances.length, 1); assert.equal(fixture.state.attendances[0].status, "ABSENT");
   const write = fixture.calls.find(c => c.method === "PUT" && c.route.startsWith("/api/attendances/"));
   assert.deepEqual(Object.keys(write.body).sort(), ["classId", "date", "lessonId", "memberId", "status"]);
   assert.equal(write.body.date, detail.dateTime);
   await services.attendanceService.deleteAttendance(detail, fixture.ids.member);
   assert.equal(fixture.state.attendances.length, 0);
   assert.equal((await services.scheduleService.getSessionDetail(fixture.ids.schedule)).attendance.length, 0);
  });
  await t.test("invalid values, another coach and ambiguous sessions cause no writes", async () => {
   const before = fixture.calls.length;
   await assert.rejects(services.attendanceService.saveAttendance(detail, { [fixture.ids.member]: "LATE" }), /PRESENT or ABSENT/);
   await assert.rejects(services.attendanceService.saveAttendance({ ...detail, coachId: "other-coach" }, { [fixture.ids.member]: "PRESENT" }), e => e.status === 403);
   assert.equal(fixture.calls.length, before);
   fixture.state.schedules.push({ ...fixture.state.schedules[0], _id: "other-session", startTime: "20:00", endTime: "21:00" });
   const ambiguous = await services.scheduleService.getSessionDetail(fixture.ids.schedule);
   assert.equal(ambiguous.attendanceAmbiguous, true);
   const count = fixture.calls.length;
   await assert.rejects(services.attendanceService.saveAttendance(ambiguous, { [fixture.ids.member]: "PRESENT" }), e => e.code === "AMBIGUOUS_ATTENDANCE");
   await assert.rejects(services.attendanceService.deleteAttendance(ambiguous, fixture.ids.member), e => e.code === "AMBIGUOUS_ATTENDANCE");
   assert.equal(fixture.calls.length, count); fixture.state.schedules.pop();
  });
  await t.test("Member reads only personal endpoint and cannot write", async () => {
   await login("MEMBER"); const before = fixture.calls.length;
   assert.ok(Array.isArray(await services.attendanceService.getMyAttendance()));
   await assert.rejects(services.scheduleService.getSessionDetail(fixture.ids.schedule), e => e.code === "UNSUPPORTED_MEMBER_ATTENDANCE");
   await assert.rejects(services.attendanceService.saveAttendance(detail, { [fixture.ids.member]: "PRESENT" }), e => e.status === 403);
   assert.equal(fixture.calls.slice(before).every(c => c.route === "/api/attendances/my"), true);
   await services.scheduleService.getMemberSchedule(fixture.ids.member);
   assert.equal(fixture.calls.slice(before).some(c => c.route === "/api/attendances"), false);
  });
  await t.test("partial batch failure retains saved count and original HTTP error", async () => {
   await login("COACH");
   const extra = "999999999999999999999999";
   fixture.state.members.push({ _id: extra, userId: "unused", fullName: "Second member", phone: "0900000002", goal: "Training", level: "BEGINNER" });
   fixture.state.registrations.push({ _id: "reg2", classId: fixture.ids.class, memberId: extra, status: "CONFIRMED" });
   const batch = await services.scheduleService.getSessionDetail(fixture.ids.schedule);
   globalThis.fetch = async (url, init = {}) => {
    if (init.method === "POST" && JSON.parse(init.body).memberId === extra) return new Response(JSON.stringify({ success: false, message: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    return fixture.fetch(url, init);
   };
   try { await assert.rejects(services.attendanceService.saveAttendance(batch, { [fixture.ids.member]: "PRESENT", [extra]: "ABSENT" }), e => e.status === 500 && e.message.startsWith("1 attendance records saved")); }
   finally { globalThis.fetch = fixture.fetch; }
   assert.equal(fixture.state.attendances.length, 1); assert.equal(fixture.state.attendances[0].memberId, fixture.ids.member);
   const refreshed = await services.scheduleService.getSessionDetail(fixture.ids.schedule);
   await services.attendanceService.saveAttendance(refreshed, { [fixture.ids.member]: "PRESENT", [extra]: "ABSENT" });
   assert.equal(fixture.state.attendances.length, 2);
   await login("MEMBER");
  });
  await t.test("GET remains unscoped in the fixture to reflect the actual BE limitation; Member writes reject", async () => {
   const headers = { authorization: "Bearer test-token-MEMBER", "Content-Type": "application/json" };
   assert.equal((await fixture.fetch("https://api.test.invalid/api/attendances", { headers })).status, 200);
   assert.equal((await fixture.fetch("https://api.test.invalid/api/attendances", { headers, method: "POST", body: JSON.stringify({ memberId: fixture.ids.member, status: "PRESENT" }) })).status, 403);
  });
 } finally { await server.close(); globalThis.fetch = prior; }
});
