import { classApi, lessonApi, roomApi, scheduleApi, learningPathApi } from "./resources.js";

export async function loadClassScheduleContext(classId) {
  const [classes, lessons, rooms, sessions, paths, templates] = await Promise.all([
    classApi.list(), lessonApi.forClass(classId), roomApi.list(), scheduleApi.list(), learningPathApi.list(), lessonApi.templates(),
  ]);
  const classItem = classes.find(item => item.id === classId);
  if (!classItem) throw new Error("Không tìm thấy lớp học.");
  return { classItem, lessons, rooms, sessions, paths, templates };
}

export function saveClassSchedulePlan(plan, context, apis = { scheduleApi }) {
  return apis.scheduleApi.generateClass({
    classId: context.classItem.id, learningPathId: plan.learningPathId,
    courseId: plan.courseId, coachId: plan.coachId,
    newCurriculum: plan.newLessonCount > 0, expectedLessons: plan.expectedLessons,
    rows: plan.rows.map(({ lessonOrder, roomId, date, startTime, endTime }) =>
      ({ lessonOrder, roomId, date, startTime, endTime })),
  });
}
