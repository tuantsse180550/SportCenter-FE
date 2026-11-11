import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient, ApiError } from "../src/api/apiClient.js";
import { classItem, person, registration, workoutResult, payment, workoutPlan } from "../src/services/api/normalize.js";
const response = (status, body) => new Response(JSON.stringify(body), { status });
test("Missing populated references retain real Payment/result records without fabricating relations", () => {
  const row = payment({ _id: "payment", classRegistrationId: null, amount: 1200000, status: "SUCCESS" });
  assert.equal(row.id, "payment"); assert.equal(row.amount, 1200000); assert.equal(row.status, "SUCCESS");
  assert.equal(row.registration, null); assert.equal(row.classItem, undefined);
  assert.equal(registration(null), null); assert.equal(workoutPlan(null), null);
  const result = workoutResult({ _id: "result", workoutPlanId: null, result: "Completed" });
  assert.equal(result.id, "result"); assert.equal(result.workoutPlan, null);
});
function client(fetchImpl) { const tokenStore = { token: "test-token", getToken() { return this.token; }, clear() { this.token = null; } }; let mutations = 0; return { request: createApiClient({ baseUrl: "https://test.invalid/", fetchImpl, tokenStore, onMutation: () => mutations++ }), tokenStore, mutations: () => mutations }; }
test("API client serializes JSON and centralizes bearer headers/envelope", async () => {
  let observed; const c = client(async (url, init) => { observed = { url, init }; return response(201, { success: true, data: { id: "result" } }); });
  assert.deepEqual(await c.request("/api/classes", { method: "POST", body: { name: "Class" } }), { id: "result" });
  assert.equal(observed.url, "https://test.invalid/api/classes"); assert.equal(observed.init.headers.Authorization, "Bearer test-token"); assert.equal(observed.init.body, '{"name":"Class"}'); assert.equal(c.mutations(), 1);
});
test("401 clears the session, including a non-JSON error body", async () => {
  const c = client(async () => response(401, { success: false, message: "Expired" }));
  await assert.rejects(c.request("/api/auth/me"), (e) => e instanceof ApiError && e.status === 401); assert.equal(c.tokenStore.token, null);
  const invalid = client(async () => new Response("Unauthorized", { status: 401 })); await assert.rejects(invalid.request("/api/auth/me")); assert.equal(invalid.tokenStore.token, null);
});
test("403/validation/network errors are visible and never invalidate valid auth", async () => {
  for (const status of [403, 409, 422, 500]) { const c = client(async () => response(status, { success: false, message: "Rejected", errors: { field: "invalid" } })); await assert.rejects(c.request("/api/classes"), (e) => e.status === status && e.details.field === "invalid"); assert.equal(c.tokenStore.token, "test-token"); assert.equal(c.mutations(), 0); }
  const c = client(async () => { throw new TypeError("offline"); }); await assert.rejects(c.request("/api/classes"), (e) => e.code === "NETWORK");
});
test("public login omits bearer and invalid credentials do not clear unrelated session", async () => { let headers; const c = client(async (_, init) => { headers = init.headers; return response(401, { message: "Invalid credentials" }); }); await assert.rejects(c.request("/api/auth/login", { method: "POST", authenticated: false, body: {} })); assert.equal(headers.Authorization, undefined); assert.equal(c.tokenStore.token, "test-token"); });
test("missing configuration/token is blocked before any request", async () => { const request = createApiClient({ fetchImpl: () => assert.fail("Must not fetch") }); await assert.rejects(request("/api/classes"), (e) => e.code === "CONFIGURATION"); const c = client(() => assert.fail("Must not fetch")); c.tokenStore.clear(); await assert.rejects(c.request("/api/classes"), (e) => e.status === 401); });
test("timeout and stale-session responses cannot produce a successful result", async () => {
  const request = createApiClient({ baseUrl: "https://test.invalid", timeoutMs: 5, tokenStore: { getToken: () => "a" }, fetchImpl: (_, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")))) }); await assert.rejects(request("/api/classes"), (e) => e.code === "ABORTED");
  const c = client(async () => { c.tokenStore.token = "changed"; return response(200, { data: [] }); }); await assert.rejects(c.request("/api/classes"), (e) => e.code === "SESSION_CHANGED");
});
test("normalization handles populated Mongo references without inventing business fields", () => {
  const coach = { _id: "coach", fullName: "Coach", userId: "u" }; const cls = classItem({ _id: "class", subjectId: { _id: "subject", name: "Yoga" }, courseId: { _id: "course", name: "Course" }, coachId: coach }); assert.equal(cls.id, "class"); assert.equal(cls.coachId, "coach"); assert.equal(cls.coach.name, "Coach"); assert.equal(cls.capacity, undefined); assert.equal(cls.status, undefined);
  assert.equal(person(coach).userId, "u"); assert.equal(registration({ _id: "r", classId: { _id: "class" }, memberId: "member", status: "PENDING_PAYMENT" }).status, "PENDING_PAYMENT");
  assert.equal(workoutResult({ _id: "result", workoutPlanId: { _id: "plan", coachId: coach, classId: "class" }, memberId: "member" }).coach.name, "Coach");
});
test("logout while the response body is loading discards its data", async () => {
  let release;
  const body = new Promise(resolve => { release = resolve; });
  const c = client(async () => ({ status: 200, ok: true, text: () => body }));
  const pending = c.request("/api/auth/me");
  await Promise.resolve();
  c.tokenStore.clear();
  release(JSON.stringify({ success: true, data: { id: "old-user" } }));
  await assert.rejects(pending, e => e.code === "SESSION_CHANGED");
});
test("overlapping GETs share a request; completion and failures never become cached data", async () => {
  let release, calls = 0;
  let pending = new Promise(resolve => { release = resolve; });
  const c = client(async () => { calls++; await pending; return response(200, { success: true, data: [] }); });
  const a = c.request("/api/members");
  const b = c.request("/api/members");
  assert.equal(a, b);
  release();
  await Promise.all([a, b]);
  assert.equal(calls, 1);
  pending = Promise.resolve();
  await c.request("/api/members");
  assert.equal(calls, 2);
  let failedCalls = 0;
  const failing = client(async () => { failedCalls++; return response(500, { success: false, message: "Failure" }); });
  await Promise.allSettled([failing.request("/api/members"), failing.request("/api/members")]);
  assert.equal(failedCalls, 1);
  await assert.rejects(failing.request("/api/members"));
  assert.equal(failedCalls, 2);
});
test("mutations and session changes separate read requests", async () => {
  let release, reads = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const c = client(async (_, init) => {
    if (init.method === "GET") { reads++; await gate; }
    return response(200, { success: true, data: [] });
  });
  const old = c.request("/api/members");
  await c.request("/api/members", { method: "POST", body: {} });
  const afterWrite = c.request("/api/members");
  assert.notEqual(old, afterWrite);
  c.tokenStore.token = "new-session";
  const newSession = c.request("/api/members");
  assert.notEqual(afterWrite, newSession);
  release();
  const results = await Promise.allSettled([old, afterWrite, newSession]);
  assert.equal(reads, 3);
  assert.equal(results[0].reason.code, "SESSION_CHANGED");
  assert.equal(results[2].status, "fulfilled");
});
test("malformed successful envelopes reject as response errors, not empty/mock data", async () => {
  for (const body of [null, [], "unexpected", {}, { success: true }]) {
    const c = client(async () => response(200, body));
    await assert.rejects(c.request("/api/classes"), e => e.code === "INVALID_RESPONSE");
    assert.equal(c.tokenStore.token, "test-token");
  }
  const deletion = client(async () => response(200, { success: true, message: "Deleted" }));
  assert.equal(await deletion.request("/api/classes/id", { method: "DELETE" }), undefined);
});
