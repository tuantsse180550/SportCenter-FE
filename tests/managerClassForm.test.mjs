import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createApiClient } from "../src/api/apiClient.js";
import { classFormChoices } from "../src/components/manager/classFormChoices.js";
import { coach as normalizeCoach } from "../src/services/api/normalize.js";

test("class form requires subject and filters courses and occupied coaches", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { ClassFormModal } = await server.ssrLoadModule("/src/components/manager/ClassFormModal.jsx");
    const options = {
      subjects: [{ id: "yoga", name: "Yoga" }, { id: "boxing", name: "Boxing" }],
      courses: [{ id: "y", name: "Yoga 1", subjectId: { _id: "yoga" } }, { id: "b", name: "Boxing 1", subjectId: "boxing" }],
      coaches: [{ id: "taken", name: "Occupied", subjectIds: ["yoga"] }, { id: "free", name: "Free", subjectIds: [{ _id: "boxing" }] }, { id: "legacy", name: "Legacy" }, { id: "multiple", subjectIds: ["yoga", "boxing"] }],
      classes: [{ id: "existing", coachId: "taken" }],
    };
    assert.deepEqual(classFormChoices(options, "").courses, []);
    assert.deepEqual(classFormChoices(options, "yoga").courses.map(c => c.id), ["y"]);
    assert.deepEqual(classFormChoices(options, "boxing").coaches.map(c => c.id), ["free"]);
    assert.deepEqual(classFormChoices(options, "yoga", "existing").coaches.map(c => c.id), ["taken"]);
    assert.deepEqual(classFormChoices(options, "yoga").coaches, []);
    assert.deepEqual(classFormChoices(options, "").coaches, []);
    const html = renderToStaticMarkup(createElement(ClassFormModal, { title: "Create", options }));
    assert.equal((html.match(/<select disabled=""/g) || []).length, 2);
    assert.doesNotMatch(html, /Yoga 1|Boxing 1|Occupied/);
  } finally { await server.close(); }
});

test("coach normalization preserves subjectIds references without inventing a specialty", () => {
  assert.deepEqual(normalizeCoach({ _id: "coach", subjectIds: [{ _id: "yoga" }] }).subjectIds, ["yoga"]);
  assert.deepEqual(normalizeCoach({ _id: "legacy" }).subjectIds, []);
  assert.deepEqual(normalizeCoach({ _id: "legacy", subjectId: "yoga" }).subjectIds, []);
});

test("coach API sends subjectIds when saving specialty and retains the returned array", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  const previousFetch = globalThis.fetch;
  let tokenStore;
  let call;
  try {
    globalThis.fetch = async (url, options) => {
      call = { url, ...options };
      return new Response(JSON.stringify({ success: true, data: { _id: "coach", fullName: "Coach", ...JSON.parse(options.body) } }));
    };
    tokenStore = (await server.ssrLoadModule("/src/api/session.js")).session;
    tokenStore.setToken("offline-test-only");
    const { coachApi } = await server.ssrLoadModule("/src/services/api/resources.js");
    const result = await coachApi.update("coach", { subjectIds: ["yoga"] });
    assert.equal(call.method, "PUT");
    assert.match(call.url, /\/api\/coaches\/coach$/);
    assert.deepEqual(JSON.parse(call.body), { subjectIds: ["yoga"] });
    assert.deepEqual(result.subjectIds, ["yoga"]);
  } finally {
    globalThis.fetch = previousFetch;
    tokenStore?.clear();
    await server.close();
  }
});

test("Excel upload preserves multipart body, bearer token and refreshes reads", async () => {
  const body = new FormData(); body.append("file", new Blob(["xlsx"]), "schedule.xlsx");
  let seen, mutations = 0;
  const client = createApiClient({ baseUrl: "https://test.invalid", tokenStore: { getToken: () => "test" }, onMutation: () => mutations++, fetchImpl: async (_url, options) => {
    seen = options;
    return new Response(JSON.stringify({ success: true, data: { successCount: 1, errorCount: 1 } }));
  } });
  const result = await client("/api/schedules/import", { method: "POST", body });
  assert.equal(seen.body, body);
  assert.equal(seen.headers["Content-Type"], undefined);
  assert.equal(seen.headers.Authorization, "Bearer test");
  assert.equal(result.errorCount, 1);
  assert.equal(mutations, 1);
});
