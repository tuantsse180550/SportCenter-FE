import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";
import { createAuthService } from "../src/services/api/createAuthService.js";
import { ApiError } from "../src/api/apiClient.js";

test("Member uses own profile and confirmed-only schedule without staff registration/payment lists (fixture)", async () => {
  const f = createBackendFixture(); const prior = globalThis.fetch; globalThis.fetch = f.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const s = await server.ssrLoadModule("/src/services/index.js");
    const { user } = await s.authService.login({ email: "member@test.invalid", password: "test-password" });
    assert.ok(f.calls.some(c => c.route === "/api/members/me"));
    assert.equal(f.calls.some(c => c.route === "/api/members"), false);
    f.options.errors["/api/class-registrations"] = 403;
    f.options.errors["/api/payments"] = 403;
    f.state.registrations.push({ _id: "reg", memberId: f.ids.member, classId: f.ids.class, status: "PENDING_PAYMENT" });
    const pending = await s.scheduleService.getMemberSchedule(user.memberId);
    assert.deepEqual(pending, []);
    f.state.registrations[0].status = "CONFIRMED";
    const before = f.calls.length;
    const confirmed = await s.scheduleService.getMemberSchedule(user.memberId);
    assert.equal(confirmed[0].registrationStatus, "CONFIRMED");
    assert.ok(f.calls.slice(before).some(c => c.route === "/api/schedules/my"));
    assert.equal(f.calls.slice(before).some(c => c.route === "/api/schedules"), false);
    await s.memberService.updateProfile(user.memberId, { goal: "Fitness", userId: "ignored", role: "ignored" });
    assert.deepEqual(f.calls.find(c => c.method === "PUT" && c.route === "/api/members/me").body, { goal: "Fitness" });
    assert.equal((await s.memberService.getMemberDetail(user.memberId)).goal, "Fitness");
    assert.equal(f.calls.some(c => c.route === "/api/class-registrations" || c.route === "/api/payments"), false);
    f.options.errors["/api/schedules/my"] = 500;
    await assert.rejects(s.scheduleService.getMemberSchedule(user.memberId), e => e.status === 500);
    delete f.options.errors["/api/schedules/my"];
    f.state.members.length = 0;
    const restored = await s.authService.restore();
    assert.equal(restored.memberId, undefined);
    assert.ok(s.authService.hasToken());
    const created = await s.memberService.createMyProfile({ fullName: "Member", phone: "0900000000", goal: "Fitness", level: "BEGINNER", userId: "ignored" });
    assert.equal(created.userId, user.id);
    assert.equal(f.calls.find(c => c.route === "/api/members/me" && c.method === "POST").body.userId, undefined);
  } finally { await server.close(); globalThis.fetch = prior; }
});

test("profile endpoint failures do not trigger a legacy list fallback or a fabricated profile", async () => {
  for (const status of [404, 500]) {
    let token;
    const listeners = new Set();
    const store = { getToken: () => token, setToken(value) { token = value; }, clear() { token = null; listeners.forEach(f => f()); }, subscribe(f) { listeners.add(f); } };
    const auth = createAuthService({
      request: async () => ({ token: "fixture-token", user: { id: "user", email: "x@test.invalid", role: "MEMBER", status: "ACTIVE" } }), tokenStore: store,
      getMyProfile: async () => { throw new ApiError("Profile error", { status }); },
      listMembers: async () => assert.fail("No fallback list"), listCoaches: async () => [], invalidate() {},
    });
    if (status === 404) {
      const { user } = await auth.login({ email: "x", password: "fixture-input" });
      assert.equal(user.memberId, undefined); assert.ok(token);
    } else {
      await assert.rejects(auth.login({ email: "x", password: "fixture-input" }), e => e.status === 500);
      assert.equal(token, null);
    }
  }
});
