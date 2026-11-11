import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
// Existing BE code, in-memory models only. No MongoDB connection or write methods.
const requireBE = createRequire(new URL("../../SportCenter-BE/package.json", import.meta.url));
const express = requireBE("express"), jwt = requireBE("jsonwebtoken");
const id = "a".repeat(24), memberId = "b".repeat(24);
test("existing receipt API enforces JWT and ownership; returns real HTML only for success", async t => {
  const registration = { memberId: { _id: memberId, fullName: "<script>test</script>", userId: "1".repeat(24) }, classId: { name: "Yoga sáng", courseId: { name: "Yoga" } } };
  const state = { member: { _id: memberId }, payment: { _id: id, status: "SUCCESS", amount: 100000, paymentDate: "2026-10-28T02:00:00Z", paymentMethod: "ONLINE", classRegistrationId: registration } };
  const env = { JWT_SECRET: "offline-test-only-key" };
  const deps = {
    "../models/Payment": { findById: () => ({ select() { return this; }, populate() { return this; }, lean: async () => { if (state.fail) throw new Error("private db failure"); return state.payment; } }) },
    "../models/Member": { findOne: async () => state.member },
    "../services/vnpayService": requireBE("./src/services/vnpayService.js"), "../services/payosService": requireBE("./src/services/payosService.js"),
    "../models/ClassRegistration": {}, "../models/Class": {}, "../models/Course": {},
    mongoose: { isValidObjectId: value => /^[a-f0-9]{24}$/i.test(value) },
    vnpay: { VNPay: class {}, ProductCode: {}, VnpLocale: {} },
  };
  const load = (file, require) => {
    const context = { module: { exports: {} }, require, process: { env }, console: { error() {} } };
    vm.runInNewContext(fs.readFileSync(new URL("../../SportCenter-BE/src/" + file, import.meta.url), "utf8"), context);
    return context.module.exports;
  };
  const controller = load("controllers/paymentController.js", name => { if (!(name in deps)) throw new Error("Unexpected dependency " + name); return deps[name]; });
  const roleIds = { MEMBER: "1".repeat(24), COACH: "2".repeat(24), CENTER_MANAGER: "3".repeat(24), RECEPTIONIST: "4".repeat(24) };
  const auth = load("middlewares/authMiddleware.js", name => name === "../models/User" ? { findById: id => ({ select: async () => ({ _id: id, role: Object.keys(roleIds).find(role => roleIds[role] === id), status: "ACTIVE" }) }) } : requireBE(name));
  const router = load("routes/paymentRoutes.js", name => name === "express" ? express : name.includes("paymentController") ? controller : name.includes("payosController") ? requireBE("./src/controllers/payosController.js") : name.includes("authMiddleware") ? auth : requireBE("./src/middlewares/roleMiddleware.js"));
  const app = express(); app.use("/api/payments", router);
  const server = await new Promise(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const token = role => jwt.sign({ userId: roleIds[role], role }, env.JWT_SECRET, { expiresIn: "5m" });
  const request = async (paymentId = id, bearer = token("MEMBER")) => {
    const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/payments/" + paymentId + "/receipt", { headers: bearer ? { Authorization: "Bearer " + bearer } : {} });
    return { status: response.status, type: response.headers.get("content-type"), body: await response.text() };
  };
  assert.equal((await request(id, null)).status, 401);
  assert.equal((await request(id, "invalid")).status, 401);
  assert.equal((await request(id, token("COACH"))).status, 403);
  assert.equal((await request("invalid")).status, 400);
  const paid = await request();
  assert.equal(paid.status, 200); assert.ok(paid.type.includes("text/html"));
  assert.ok(paid.body.includes("<title>Biên nhận thanh toán - " + id + "</title>"));
  assert.ok(paid.body.includes("ĐÃ THANH TOÁN")); assert.ok(paid.body.includes("Yoga sáng"));
  assert.ok(paid.body.includes("&lt;script&gt;test&lt;/script&gt;"));
  registration.memberId.userId = "c".repeat(24); assert.equal((await request()).status, 403);
  registration.memberId.userId = null; assert.equal((await request()).status, 403);
  registration.memberId.userId = "1".repeat(24);
  for (const status of ["PENDING", "FAILED"]) { state.payment.status = status; assert.equal((await request()).status, 409); }
  state.payment.status = "SUCCESS";
  state.payment.classRegistrationId = null; assert.equal((await request()).status, 404);
  state.payment.classRegistrationId = registration;
  state.payment = null; assert.equal((await request()).status, 404);
  state.fail = true; const failed = await request(); assert.equal(failed.status, 500); assert.doesNotMatch(failed.body, /private db failure/);
});
