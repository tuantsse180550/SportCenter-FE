import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createBackendFixture } from "./networkFixture.mjs";

test("Room/Schedule payloads and personal attendance use actual contracts (HTTP fixture, no live writes)", async () => {
  const fixture = createBackendFixture(); const previous = globalThis.fetch;
  const room = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", roomNumber: "R01", name: "Phòng thử nghiệm", capacity: 12, status: "ACTIVE" };
  const calls = []; let conflict = false;
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (path.startsWith("/api/rooms") || path.startsWith("/api/schedules") && options.method && options.method !== "GET") {
      const body = options.body ? JSON.parse(options.body) : null; calls.push({ path, ...options, body });
      if (conflict) return new Response(JSON.stringify({ success: false, message: "This room already has a schedule during the selected time" }), { status: 409 });
      const data = path === "/api/rooms" && (!options.method || options.method === "GET") ? [room] : path === "/api/schedules" ? { _id: fixture.ids.schedule, ...body, roomId: room } : room;
      return new Response(JSON.stringify({ success: true, data }), { status: options.method === "POST" ? 201 : 200 });
    }
    return fixture.fetch(url, options);
  };
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const services = await server.ssrLoadModule("/src/services/index.js");
    const { roomApi, scheduleApi } = await server.ssrLoadModule("/src/services/api/resources.js");
    await services.authService.login({ email: "center_manager@test.invalid", password: "test-password" });
    assert.equal((await roomApi.list())[0].capacity, 12);
    assert.equal((await roomApi.get(room._id)).roomNumber, "R01");
    await roomApi.create({ ...room, fieldOutsideSchema: true });
    assert.deepEqual(Object.keys(calls.at(-1).body).sort(), ["capacity", "name", "roomNumber", "status"]);
    await roomApi.update(room._id, { capacity: 15 }); assert.deepEqual(calls.at(-1).body, { capacity: 15 });
    const session = await scheduleApi.create({ classId: fixture.ids.class, lessonId: fixture.ids.lesson, roomId: room._id, date: "2026-10-19", startTime: "18:00", endTime: "19:00", status: "SCHEDULED", fake: true });
    assert.equal(calls.at(-1).body.roomId, room._id); assert.equal(calls.at(-1).body.fake, undefined);
    assert.equal(session.room.roomNumber, "R01"); assert.equal(session.roomId, room._id);
    conflict = true; await assert.rejects(scheduleApi.update(session.id, session), e => e.status === 409); conflict = false;
    await services.authService.login({ email: "member@test.invalid", password: "test-password" });
    assert.deepEqual(await services.attendanceService.getMyAttendance(), []);
    fixture.state.attendances.push({ _id: "own", memberId: fixture.ids.member, classId: fixture.ids.class, lessonId: fixture.ids.lesson, date: "2026-10-19T00:00:00Z", status: "PRESENT" }, { _id: "other", memberId: "other-member", status: "ABSENT" });
    const rows = await services.attendanceService.getMyAttendance();
    assert.equal(rows.length, 1); assert.equal(rows[0].classItem.name, "Test Class"); assert.equal(rows[0].lesson.title, "First lesson"); assert.equal(rows[0].status, "PRESENT");
    assert.equal(fixture.calls.some(c => c.route === "/api/attendances"), false);
    fixture.options.errors["/api/attendances/my"] = 500;
    await assert.rejects(services.attendanceService.getMyAttendance(), e => e.status === 500);
  } finally { await server.close(); globalThis.fetch = previous; }
});
