import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

test("Manager API adapters preserve class payloads, counts, totals and failures (fixture)", async () => {
  const fixture = createBackendFixture(); const prior = globalThis.fetch; globalThis.fetch = fixture.fetch;
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { authService, classService, reportService } = await server.ssrLoadModule("/src/services/index.js");
    const { learningPathApi } = await server.ssrLoadModule("/src/services/api/resources.js");
    await authService.login({ email: "center_manager@test.invalid", password: "test-password" });
    const options = await classService.getFormOptions();
    assert.equal(options.coaches[0].id, fixture.ids.coach);
    const payload = { name: "Class", subjectId: fixture.ids.subject, courseId: fixture.ids.course, coachId: fixture.ids.coach };
    const created = await classService.createClass({ ...payload, capacity: 50, room: "ignored" });
    assert.deepEqual(fixture.calls.find(c => c.method === "POST" && c.route === "/api/classes").body, payload);
    await classService.updateClass(created.id, { ...payload, name: "Updated" });
    await classService.assignCoach(created.id, fixture.ids.coach);
    const update = fixture.calls.find(c => c.method === "PUT" && c.route.endsWith(created.id));
    assert.deepEqual(Object.keys(update.body).sort(), ["coachId", "courseId", "name", "subjectId"]);
    assert.equal((await classService.getClassDetail(created.id)).name, "Updated");
    const path = await learningPathApi.create({ courseId: fixture.ids.course, name: "Path", description: "Description", madeUp: true });
    assert.ok(path.id);
    assert.equal((await learningPathApi.list()).length, 1);
    const dashboard = await reportService.getDashboard();
    assert.equal(dashboard.totalMembers, 1); assert.equal(dashboard.classes, 2); assert.equal(dashboard.revenue, 0);
    fixture.options.errors["/api/classes"] = 500;
    await assert.rejects(classService.listClasses(), e => e.status === 500);
  } finally { await server.close(); globalThis.fetch = prior; }
});
