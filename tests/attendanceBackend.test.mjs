import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const requireBE = createRequire(new URL("../../SportCenter-BE/package.json", import.meta.url));
test("Actual Coach controller checks assignment/confirmed roster and normalizes UTC day (stubbed models)", async () => {
 const Coach = requireBE("./src/models/Coach.js"), Schedule = requireBE("./src/models/Schedule.js"), Class = requireBE("./src/models/Class.js"), Lesson = requireBE("./src/models/Lesson.js"), Member = requireBE("./src/models/Member.js"), Registration = requireBE("./src/models/ClassRegistration.js"), Attendance = requireBE("./src/models/Attendance.js");
 const { createCoachAttendance } = requireBE("./src/controllers/attendanceController.js");
 const patches = [];
 const stub = (model, method, fn) => { patches.push([model, method, model[method]]); model[method] = fn; };
 let assigned = true, confirmed = true, duplicate = false, created, lookup;
 stub(Coach, "findOne", async () => ({ _id: "coach" }));
 stub(Schedule, "findById", async () => ({ classId: "class", lessonId: "lesson", date: "2026-10-16T19:00:00Z" }));
 stub(Class, "findOne", async q => { assert.equal(q.coachId, "coach"); return assigned ? { _id: "class" } : null; });
 stub(Lesson, "findById", async () => ({ _id: "lesson", classId: "class" }));
 stub(Member, "findById", async () => ({ _id: "member" }));
 stub(Registration, "findOne", async q => { assert.equal(q.status, "CONFIRMED"); return confirmed ? {} : null; });
 stub(Attendance, "findOne", async q => { lookup = q; return duplicate ? {} : null; });
 stub(Attendance, "create", async data => { created = data; return { _id: "attendance", ...data }; });
 const invoke = async () => {
  let status;
  await createCoachAttendance({ user: { userId: "user", role: "COACH" }, body: { memberId: "member", scheduleId: "schedule", status: "PRESENT" } }, { status(code) { status = code; return this; }, json() {} });
  return status;
 };
 try {
  assert.equal(await invoke(), 201);
  assert.equal(created.date.toISOString(), "2026-10-16T00:00:00.000Z");
  assert.equal(lookup.date.toISOString(), created.date.toISOString());
  assigned = false; assert.equal(await invoke(), 403);
  assigned = true; confirmed = false; assert.equal(await invoke(), 400);
  confirmed = true; duplicate = true; assert.equal(await invoke(), 409);
 } finally { for (const [model, method, original] of patches.reverse()) model[method] = original; }
});
test("Actual attendance route role middleware authorizes staff writes and rejects Member writes without DB access", () => {
 const router = requireBE("./src/routes/attendanceRoutes.js");
 const routes = router.stack.filter(layer => layer.route).map(layer => layer.route);
 assert.equal(routes.find(route => route.methods.get && route.path === "/").stack.length, 2); // auth + unscoped controller
 const personal = routes.find(route => route.methods.get && route.path === "/my");
 assert.equal(personal.stack.length, 3);
 for (const role of ["MEMBER", "COACH", "CENTER_MANAGER", "RECEPTIONIST"]) {
  let called = false;
  personal.stack[1].handle({ user: { role } }, { status() { return this; }, json() {} }, () => { called = true; });
  assert.equal(called, role === "MEMBER");
 }
 for (const method of ["post", "put", "delete"]) {
  const route = routes.find(item => item.methods[method] && (method !== "post" || item.path === "/")); assert.equal(route.stack.length, 4);
  const authorize = route.stack[1].handle;
  for (const role of ["CENTER_MANAGER", "COACH", "RECEPTIONIST", "MEMBER"]) {
   let called = false; let status;
   const response = { status(code) { status = code; return this; }, json() {} };
   authorize({ user: { role } }, response, () => { called = true; });
   assert.equal(called, role !== "MEMBER"); if (role === "MEMBER") assert.equal(status, 403);
  }
 }
});
test("Actual GET controller scopes records to the Member in JWT (stubbed model, no MongoDB)", async () => {
 const Attendance = requireBE("./src/models/Attendance.js"); const { getAttendances } = requireBE("./src/controllers/attendanceController.js");
 const Member = requireBE("./src/models/Member.js"); const previousMember = Member.findOne; Member.findOne = async () => ({ _id: "one" });
 const previousFind = Attendance.find; const queries = []; let body; let status;
 const records = [{ memberId: "one", status: "PRESENT" }, { memberId: "another", status: "ABSENT" }];
 Attendance.find = (...args) => { queries.push(args); return { populate() { return this; }, sort() { return Promise.resolve(records.filter(row => row.memberId === args[0]?.memberId)); } }; };
 try {
  await getAttendances({ user: { userId: "member-user", role: "MEMBER" } }, { status(code) { status = code; return this; }, json(value) { body = value; } });
  assert.equal(status, 200); assert.deepEqual(queries, [[{ memberId: "one" }]]); assert.equal(body.data.length, 1);
 } finally { Attendance.find = previousFind; Member.findOne = previousMember; }
});
