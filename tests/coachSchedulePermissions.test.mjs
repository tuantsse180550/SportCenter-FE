import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

test("coach schedule and session detail use assigned students without the forbidden registration list", async () => {
  const f = createBackendFixture(), previous = globalThis.fetch;
  globalThis.fetch = f.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { authService, scheduleService } = await server.ssrLoadModule("/src/services/index.js");
    await authService.login({ email: "coach@test.invalid", password: "test-password" });
    const user = authService.getCurrentUser();
    assert.equal(user.coachId, f.ids.coach);
    assert.equal((await f.fetch("https://api.test.invalid/api/class-registrations", { headers: { authorization: "Bearer test-token-COACH" } })).status, 403);
    const start = f.calls.length;
    let sessions = await scheduleService.getCoachSessions(user.coachId);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].memberCount, 0); // Empty classes still have a teaching schedule.
    f.state.registrations.push(
      { _id: "confirmed", classId: f.ids.class, memberId: f.ids.member, status: "CONFIRMED" },
      { _id: "pending", classId: f.ids.class, memberId: f.ids.member, status: "PENDING_PAYMENT" },
      { _id: "cancelled", classId: f.ids.class, memberId: f.ids.member, status: "CANCELLED" },
      { _id: "unrelated", classId: "another-class", memberId: f.ids.member, status: "CONFIRMED" },
    );
    sessions = await scheduleService.getCoachSessions(user.coachId);
    assert.equal(sessions[0].memberCount, 1);
    const detail = await scheduleService.getSessionDetail(f.ids.schedule);
    assert.deepEqual(detail.members.map(member => member.id), [f.ids.member]);
    assert.equal(detail.members[0].name, "Test Member");
    assert.equal(detail.attendance.length, 0);
    assert.equal(f.calls.slice(start).some(call => call.route === "/api/class-registrations"), false);
    assert.ok(f.calls.slice(start).some(call => call.route === "/api/coaches/my-students"));
    assert.ok(f.calls.slice(start).some(call => call.route === "/api/schedules/coach/my"));
    f.options.errors["/api/coaches/my-students"] = 500;
    await assert.rejects(scheduleService.getCoachSessions(user.coachId), error => error.status === 500);
    delete f.options.errors["/api/coaches/my-students"];
    for (const data of [{}, [{ member: f.state.members[0], class: null }], [{ member: null, class: { _id: f.ids.class } }]]) {
      globalThis.fetch = (url, init) => url.endsWith("/api/coaches/my-students")
        ? Promise.resolve(new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } })) : f.fetch(url, init);
      await assert.rejects(scheduleService.getCoachSessions(user.coachId), error => error.code === "INVALID_RESPONSE");
    }
  } finally { globalThis.fetch = previous; await server.close(); }
});
