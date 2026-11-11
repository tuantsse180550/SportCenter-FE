import test from "node:test";
import assert from "node:assert/strict";
import { groupSchedules } from "../src/components/manager/scheduleGroups.js";

test("schedule grouping follows class subject and course IDs, retaining separate courses with equal names", () => {
  const classes = [
    { id: "a", subjectId: "yoga", sport: "Yoga", courseId: "c1", course: { name: "Cơ bản" } },
    { id: "b", subjectId: "yoga", sport: "Yoga", courseId: "c2", course: { name: "Cơ bản" } },
    { id: "c", subjectId: "boxing", sport: "Boxing", courseId: "c3", course: { name: "Cơ bản" } },
  ];
  const sessions = [
    { id: "late", classId: "a", date: "2026-11-02", startTime: "10:00" },
    { id: "early", classId: "a", date: "2026-11-01", startTime: "08:00", status: "CANCELLED" },
    { id: "other-course", classId: "b" },
    { id: "other-subject", classId: "c" },
  ];
  const groups = groupSchedules(sessions, classes);
  assert.equal(groups.length, 2);
  const yoga = groups.find(s => s.id === "yoga");
  assert.equal(yoga.courses.length, 2);
  assert.deepEqual(yoga.courses[0].sessions.map(s => s.id), ["early", "late"]);
  assert.equal(yoga.courses[0].sessions[0].status, "CANCELLED");
  assert.equal(sessions[0].id, "late");
});

test("populated schedule references work without a course subject field and missing references remain visible", () => {
  const groups = groupSchedules([
    { id: "known", classItem: { subjectId: "yoga", sport: "Yoga", courseId: "course", course: { name: "Yoga 1" } } },
    { id: "missing", classId: "deleted" },
  ], []);
  assert.equal(groups.flatMap(s => s.courses).flatMap(c => c.sessions).length, 2);
  assert.equal(groups.find(s => s.id === "yoga").courses[0].id, "course");
  assert.equal(groups.find(s => s.id === "unknown-subject").courses[0].sessions[0].id, "missing");
  assert.deepEqual(groupSchedules([], []), []);
});
