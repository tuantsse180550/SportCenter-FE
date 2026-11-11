import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, nextMonday, validatePlan } from "../scripts/realisticSeedPlan.mjs";
test("Seed blueprint respects single-class Coach rule and excludes Member/financial records", () => {
  const plan = buildPlan("2026-10-19");
  assert.deepEqual(validatePlan(plan), { accounts: 11, coaches: 8, courses: 10, subjects: 8, learningPaths: 10, classes: 8, lessons: 80, schedules: 64, rooms: 0, members: 0, registrations: 0, payments: 0, attendances: 0 });
  assert.equal(plan.accounts.filter(a => a.role === "CENTER_MANAGER").length, 1);
  assert.equal(plan.accounts.filter(a => a.role === "RECEPTIONIST").length, 2);
  assert.equal(plan.accounts.some(a => Object.hasOwn(a, "password")), false);
});
test("Vietnam timetable converts to correct UTC instants across four weeks", () => {
  const plan = buildPlan("2026-10-19");
  assert.equal(nextMonday("2026-10-16"), "2026-10-19");
  assert.equal(plan.classes[0].sessions[0].date, "2026-10-19T11:00:00.000Z");
  assert.equal(plan.classes[0].sessions.at(-1).day, "2026-11-11");
  assert.equal(plan.classes.find(c => c.key === "badminton-basic").sessions[0].date, "2026-10-24T01:00:00.000Z");
});
test("Invalid dates, duplicate assignments, unsafe contacts and schedule collisions fail before writes", () => {
  assert.throws(() => buildPlan("2026-10-20"), /START_MUST_BE_MONDAY/);
  assert.throws(() => buildPlan("2026-02-30"), /START_MUST_BE_MONDAY/);
  const clone = () => structuredClone(buildPlan("2026-10-19"));
  let plan = clone(); plan.accounts[1].email = plan.accounts[0].email;
  assert.throws(() => validatePlan(plan), /DUPLICATE_IDENTITY/);
  plan = clone(); plan.accounts[0].email = "someone@real.invalid";
  assert.throws(() => validatePlan(plan), /UNSAFE_ACCOUNT/);
  plan = clone(); plan.classes.push(structuredClone(plan.classes[0]));
  assert.throws(() => validatePlan(plan), /COACH_REUSED/);
  plan = clone(); plan.courses[0].price = Infinity;
  assert.throws(() => validatePlan(plan), /INVALID_COURSE/);
  plan = clone(); plan.classes[1].sessions[0] = structuredClone(plan.classes[0].sessions[0]);
  assert.throws(() => validatePlan(plan), /PLANNED_RESOURCE_OVERLAP/);
});
