import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

async function withMember(check) {
  const fixture = createBackendFixture();
  const previous = globalThis.fetch;
  globalThis.fetch = fixture.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const services = await server.ssrLoadModule("/src/services/index.js");
    const { user } = await services.authService.login({ email: "member@test.invalid", password: "test-password" });
    fixture.options.errors["/api/class-registrations"] = 403;
    fixture.options.errors["/api/payments"] = 403;
    await check({ fixture, services, user });
    assert.equal(fixture.calls.some(call => call.route === "/api/class-registrations" || call.route === "/api/payments" || call.route === "/api/members"), false, "Member reads must never request staff/global member data");
  } finally { await server.close(); globalThis.fetch = previous; }
}

test("Member catalog/detail and confirmed schedule work when registration/payment lists are forbidden", () => withMember(async ({ fixture, services, user }) => {
  const classes = await services.classService.listMemberClasses();
  assert.equal(classes[0].name, "Test Class");
  assert.equal(classes[0].enrolledCount, undefined);
  assert.equal(classes[0].pendingCount, undefined);
  const detail = await services.classService.getMemberClassDetail(fixture.ids.class);
  assert.equal(detail.course.price, 100000);
  assert.equal(detail.registrations, undefined);
  assert.equal(await services.classService.getMemberClassDetail("missing"), null);
  assert.equal((await services.classService.getMemberClassSessions(fixture.ids.class))[0].id, fixture.ids.schedule);
  fixture.state.registrations.push({ _id: "reg", classId: fixture.ids.class, memberId: fixture.ids.member, status: "PENDING_PAYMENT" });
  assert.deepEqual(await services.scheduleService.getMemberSchedule(user.memberId), []);
  fixture.state.registrations[0].status = "CONFIRMED";
  const sessions = await services.scheduleService.getMemberSchedule(user.memberId);
  assert.equal(sessions[0].registrationStatus, "CONFIRMED");
  assert.equal(sessions[0].memberCount, undefined);
  const profile = await services.memberService.getMemberDetail(user.memberId);
  assert.equal(profile.registrations, null);
  assert.equal(profile.payments, null);
  await assert.rejects(services.memberService.getMemberDetail("someone-else"), error => error.status === 403);
  await assert.rejects(services.scheduleService.getMemberSchedule("someone-else"), error => error.status === 403);
}));

test("a section failure stays an error; other independent Member reads remain available", () => withMember(async ({ fixture, services, user }) => {
  for (const status of [403, 404, 500]) {
    fixture.options.errors["/api/schedules/my"] = status;
    await assert.rejects(services.scheduleService.getMemberSchedule(user.memberId), error => error.status === status);
    assert.equal((await services.classService.listMemberClasses()).length, 1);
    assert.equal((await services.memberService.getMyProfile()).name, "Test Member");
  }
  delete fixture.options.errors["/api/schedules/my"];
  fixture.options.errors["/api/workout-results"] = 500;
  await assert.rejects(services.trainingResultService.listForMember(user.memberId), error => error.status === 500);
  assert.equal((await services.classService.getMemberClassDetail(fixture.ids.class)).name, "Test Class");
  fixture.options.errors["/api/schedules"] = 500;
  await assert.rejects(services.classService.getMemberClassSessions(fixture.ids.class), error => error.status === 500);
  assert.equal((await services.classService.getMemberClassDetail(fixture.ids.class)).name, "Test Class");
  fixture.options.errors["/api/members/me"] = 500;
  await assert.rejects(services.memberService.getMyProfile(), error => error.status === 500);
  fixture.options.errors["/api/members/me"] = 404;
  assert.equal(await services.memberService.getMyProfile(), null);
}));
