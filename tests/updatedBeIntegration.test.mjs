import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";
import { coachAttendanceSession } from "../src/services/api/attendanceIdentity.js";

test("Updated payment/coach contracts use real route shapes (fixture, no gateway or DB)", async t => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-10T11:30:00Z"));
  const fixture = createBackendFixture();
  const prior = globalThis.fetch;
  globalThis.fetch = fixture.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const s = await server.ssrLoadModule("/src/services/index.js");
    await s.authService.login({ email: "member@test.invalid", password: "test-password" });
    const reg = await s.classService.registerMember(fixture.ids.class, fixture.ids.member);
    const { payment } = await s.paymentService.recordPayment({ classRegistrationId: reg.id, amount: 1, paymentMethod: "ONLINE" });
    assert.equal(payment.amount, 100000);
    assert.deepEqual(fixture.calls.find(c => c.method === "POST" && c.route === "/api/payments").body, { classRegistrationId: reg.id, paymentMethod: "ONLINE" });
    const writes = fixture.calls.filter(c => c.method === "POST").length;
    assert.equal((await s.paymentService.recordPayment({ classRegistrationId: reg.id, paymentMethod: "ONLINE" })).payment.id, payment.id);
    assert.equal(fixture.calls.filter(c => c.method === "POST").length, writes);
    const checkout = await s.paymentService.createVnpayUrl(payment.id);
    assert.equal(new URL(checkout.paymentUrl).hostname, "sandbox.vnpayment.vn");
    assert.equal(fixture.state.registrations[0].status, "PENDING_PAYMENT");
    const call = fixture.calls.find(c => c.route.endsWith("/vnpay"));
    assert.equal(call.method, "POST"); assert.equal(call.body, undefined);
    fixture.options.errors["/api/payments/" + payment.id + "/vnpay"] = 500;
    await assert.rejects(s.paymentService.createVnpayUrl(payment.id), e => e.status === 500);
    delete fixture.options.errors["/api/payments/" + payment.id + "/vnpay"];
    globalThis.fetch = async (url, init) => url.endsWith("/vnpay") ? new Response(JSON.stringify({ success: true, data: { paymentId: payment.id, paymentUrl: "https://untrusted.invalid/" } }), { status: 200 }) : fixture.fetch(url, init);
    await assert.rejects(s.paymentService.createVnpayUrl(payment.id), e => e.code === "INVALID_RESPONSE");
    globalThis.fetch = fixture.fetch;
    fixture.state.payments[0].payosOrderCode = 12345; // Legacy Mobile transaction without provider tag.
    await assert.rejects(s.paymentService.recordPayment({ classRegistrationId: reg.id, paymentMethod: "ONLINE" }), e => e.code === "MOBILE_PAYMENT_PENDING");
    delete fixture.state.payments[0].payosOrderCode;
    await s.authService.login({ email: "coach@test.invalid", password: "test-password" });
    await assert.rejects(s.paymentService.createVnpayUrl(payment.id), e => e.status === 403);
    fixture.state.registrations[0].status = "CONFIRMED";
    const start = fixture.calls.length;
    const detail = await s.scheduleService.getSessionDetail(fixture.ids.schedule);
    await s.attendanceService.saveAttendance(detail, { [fixture.ids.member]: "PRESENT" });
    const create = fixture.calls.find(c => c.route === "/api/attendances/coach");
    assert.deepEqual(create.body, { memberId: fixture.ids.member, scheduleId: fixture.ids.schedule, status: "PRESENT" });
    assert.equal(fixture.calls.slice(start).some(c => c.route === "/api/attendances"), false);
    await fixture.fetch("https://api.test.invalid/api/attendances/coach", { method: "POST", headers: { authorization: "Bearer test-token-COACH" }, body: JSON.stringify(create.body) }).then(async r => assert.equal(r.status, 409));
  } finally { await server.close(); globalThis.fetch = prior; }
});
test("Coach date key follows UTC day instead of browser timezone", () => {
  const s = coachAttendanceSession({ dateTime: "2026-10-17T02:00:00+07:00" });
  assert.equal(s.dateTime, "2026-10-16T00:00:00.000Z");
});
