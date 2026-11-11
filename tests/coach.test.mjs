import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

test("Coach attendance follows schedule endpoint UTC-day identity; plans/results use verified fields (fixture)", async t => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-10T11:30:00Z"));
  const f = createBackendFixture(); const prior = globalThis.fetch; globalThis.fetch = f.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const s = await server.ssrLoadModule("/src/services/index.js");
    await s.authService.login({ email: "coach@test.invalid", password: "test-password" });
    const date = "2026-10-10T10:00:00.000Z";
    f.state.schedules[0].date = date;
    f.state.registrations.push({ _id: "reg", memberId: f.ids.member, classId: f.ids.class, status: "CONFIRMED" });
    f.state.attendances.push({ _id: "morning", memberId: f.ids.member, classId: f.ids.class, lessonId: f.ids.lesson, date: "2026-10-10T00:00:00.000Z", status: "ABSENT" });
    f.state.attendances.push({ _id: "current", memberId: f.ids.member, classId: f.ids.class, lessonId: f.ids.lesson, date, status: "PRESENT" });
    const detail = await s.scheduleService.getSessionDetail(f.ids.schedule);
    assert.equal(detail.members.length, 1);
    assert.equal(detail.attendance.length, 1);
    assert.equal(detail.attendance[0].id, "morning");
    await s.attendanceService.saveAttendance(detail, { [f.ids.member]: "ABSENT" });
    assert.equal(f.state.attendances.length, 2);
    const write = f.calls.find(c => c.method === "PUT" && c.route === "/api/attendances/morning");
    assert.equal(write.body.date, "2026-10-10T00:00:00.000Z");
    assert.deepEqual(Object.keys(write.body).sort(), ["classId", "date", "lessonId", "memberId", "status"]);
    assert.throws(() => s.trainingPlanService.createPlan({ memberId: f.ids.member, classId: f.ids.class }), e => e.status === 400);
    await s.trainingPlanService.createPlan({ coachId: f.ids.coach, memberId: f.ids.member, classId: null, goal: "Strength", level: "BEGINNER", plan: "Exercise", status: "DRAFT", sessionId: "ignored" });
    assert.equal(f.calls.find(c => c.route === "/api/workout-plans" && c.method === "POST").body.sessionId, undefined);
    assert.equal((await s.trainingPlanService.listPlans(f.ids.coach)).length, 2);
    await s.trainingResultService.createResult({ workoutPlanId: f.ids.plan, memberId: f.ids.member, result: "Done", comment: "Good", rating: 5 });
    assert.equal(f.calls.find(c => c.route === "/api/workout-results" && c.method === "POST").body.rating, undefined);
    assert.equal(f.calls.some(c => c.method === "GET" && c.route === "/api/attendances"), false);
    f.options.errors["/api/attendances/schedule/" + f.ids.schedule] = 500;
    await assert.rejects(s.scheduleService.getSessionDetail(f.ids.schedule), e => e.status === 500);
    f.state.schedules = [];
    const summary = await s.scheduleService.getCoachScheduleSummary(f.ids.coach);
    assert.equal(summary.sessions.length, 0);
    assert.equal(summary.classCount, 1, "Assigned classes remain visible before scheduling");
    assert.equal(summary.assignedClasses[0].id, f.ids.class);
    assert.equal(summary.memberCount, 1);
  } finally { await server.close(); globalThis.fetch = prior; }
});
