import { idOf } from "../../services/api/normalize.js";

export function classFormChoices(options, subjectId, classId, currentCourseId) {
  const occupied = new Set((options.classes || []).filter(c => c.id !== classId).map(c => c.coachId));
  return {
    courses: subjectId ? options.courses.filter(c => idOf(c.subjectId) === subjectId && (c.status !== "INACTIVE" || c.id === currentCourseId)) : [],
    coaches: subjectId ? options.coaches.filter(c => Array.isArray(c.subjectIds) && c.subjectIds.length === 1 && c.subjectIds.some(id => idOf(id) === subjectId) && !occupied.has(c.id)) : [],
  };
}
