export function groupSchedules(sessions, classes) {
  const classById = new Map(classes.map(item => [item.id, item]));
  const subjects = new Map();
  for (const session of sessions) {
    const cls = classById.get(session.classId) || session.classItem;
    const subjectId = cls?.subjectId || "unknown-subject";
    const courseId = cls?.courseId || "unknown-course";
    if (!subjects.has(subjectId)) subjects.set(subjectId, {
      id: subjectId, name: cls?.sport || cls?.subject?.name || "Chưa có thông tin bộ môn", courses: new Map(),
    });
    const subject = subjects.get(subjectId);
    if (!subject.courses.has(courseId)) subject.courses.set(courseId, {
      id: courseId, name: cls?.course?.name || "Chưa có thông tin khóa học", sessions: [],
    });
    subject.courses.get(courseId).sessions.push({ ...session, classItem: cls || null });
  }
  const byName = (a, b) => a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id);
  const byTime = (a, b) => [a.date || "", a.startTime || "", a.endTime || "", a.id].join("|")
    .localeCompare([b.date || "", b.startTime || "", b.endTime || "", b.id].join("|"));
  return [...subjects.values()].sort(byName).map(subject => ({
    ...subject,
    courses: [...subject.courses.values()].sort(byName).map(course => ({ ...course, sessions: course.sessions.sort(byTime) })),
  }));
}
