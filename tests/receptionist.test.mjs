import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

test("Receptionist pending payments follow current contract and confirmation remains blocked (fixture)", async () => {
  const f = createBackendFixture(); const prior = globalThis.fetch; globalThis.fetch = f.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const s = await server.ssrLoadModule("/src/services/index.js");
    await s.authService.login({ email: "receptionist@test.invalid", password: "test-password" });
    f.state.registrations.push({ _id: "reg", memberId: f.ids.member, classId: f.ids.class, status: "PENDING_PAYMENT" });
    const detailStart = f.calls.length;
    const detail = await s.memberService.getMemberDetail(f.ids.member);
    assert.equal(detail.registrations.length, 1);
    assert.equal(f.calls.slice(detailStart).filter(c => c.route === "/api/class-registrations").length, 1);
    const result = await s.paymentService.recordPayment({ classRegistrationId: "reg", amount: "100", paymentMethod: "CASH" });
    assert.equal(result.payment.status, "PENDING");
    assert.equal(result.registration.status, "PENDING_PAYMENT");
    const sent = f.calls.find(c => c.route === "/api/payments" && c.method === "POST").body;
    assert.deepEqual(sent, { classRegistrationId: "reg", paymentMethod: "CASH" });
    const before = f.calls.length;
    await assert.rejects(s.paymentService.recordPayment({ classRegistrationId: "reg", amount: 100, paymentMethod: "CASH", confirmReceived: true }), e => e.code === "UNSUPPORTED_PAYMENT_CONFIRMATION");
    assert.throws(() => s.paymentService.updatePayment(result.payment.id, { status: "SUCCESS" }), e => e.code === "UNSUPPORTED_PAYMENT_CONFIRMATION");
    assert.equal(f.calls.length, before);
    assert.throws(() => s.paymentService.updatePayment(result.payment.id, { amount: 120 }), e => e.code === "IMMUTABLE_PAYMENT_AMOUNT");
    await s.paymentService.updatePayment(result.payment.id, { paymentMethod: "BANK_TRANSFER" });
    assert.equal(f.state.payments[0].status, "PENDING");
    assert.equal(f.state.payments[0].amount, 100000);
    await assert.rejects(s.paymentService.simulatePayment(result.payment.id, "SUCCESS"), e => e.status === 403);
  } finally { await server.close(); globalThis.fetch = prior; }
});
