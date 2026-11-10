import { idOf } from "../../services/api/normalize.js";
import { validDate, validateImportRows } from "./scheduleImportLogic.js";

export function buildClassSchedulePlan(form, context) {
  if (!validDate(form.startDate) || !validDate(form.endDate) || form.startDate > form.endDate) throw new Error("Chọn ngày bắt đầu và kết thúc hợp lệ; ngày kết thúc không được trước ngày bắt đầu.");
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(form.startTime) || !timePattern.test(form.endTime) || form.startTime >= form.endTime) throw new Error("Chọn giờ học hợp lệ; giờ kết thúc phải sau giờ bắt đầu.");
  const weekdays = new Set(form.weekdays);
  if (!weekdays.size || [...weekdays].some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Chọn ít nhất một thứ học trong tuần.");
  if (!context.rooms.some(room => room.id === form.roomId && room.status === "ACTIVE")) throw new Error("Chọn phòng đang hoạt động.");
  const { classItem } = context;
  if (!classItem) throw new Error("Không tìm thấy lớp học.");
  const path = context.paths.find(item => item.id === form.learningPathId && idOf(item.courseId) === classItem.courseId);
  if (!path) throw new Error("Chọn lộ trình thuộc khóa học của lớp.");
  const ownLessons = context.lessons.filter(lesson => idOf(lesson.classId) === classItem.id).sort((a, b) => a.order - b.order);
  if (ownLessons.some(lesson => idOf(lesson.learningPathId) !== path.id)) throw new Error("Lớp đã có giáo án riêng. Chọn đúng lộ trình của các bài học hiện có.");
  const templates = (context.templates || []).filter(lesson => !idOf(lesson.classId) && idOf(lesson.learningPathId) === path.id).sort((a, b) => a.order - b.order);
  const curriculum = ownLessons.length ? ownLessons : templates;
  if (!curriculum.length) throw new Error("Lộ trình chưa có giáo án. Vào Quản lý giáo án khóa học để bổ sung bài mẫu trước khi tạo lịch.");
  if (curriculum.some(lesson => !lesson.title?.trim() || !lesson.description?.trim())) throw new Error("Giáo án còn bài thiếu tiêu đề hoặc nội dung. Vui lòng bổ sung trước khi tạo lịch.");
  if (new Set(curriculum.map(lesson => lesson.order)).size !== curriculum.length) throw new Error("Giáo án có thứ tự bài bị trùng. Vui lòng kiểm tra lại.");
  const scheduled = new Set(context.sessions.filter(session => session.classId === classItem.id && session.status !== "CANCELLED").map(session => session.lessonId));
  const available = curriculum.filter(lesson => !ownLessons.length || !scheduled.has(lesson.id));
  if (!available.length) throw new Error("Tất cả bài học của lớp đã được xếp lịch. Không có buổi mới cần tạo.");
  const rows = [];
  const lastDate = Date.parse(form.endDate + "T00:00:00Z");
  for (let day = Date.parse(form.startDate + "T00:00:00Z"); day <= lastDate; day += 86400000) {
    // The end date is an upper bound; stop once every remaining lesson has a slot.
    if (rows.length === available.length) break;
    const date = new Date(day);
    if (!weekdays.has(date.getUTCDay())) continue;
    if (rows.length === 1000) throw new Error("Tối đa 1.000 buổi mỗi lần. Hãy chọn khoảng ngày ngắn hơn.");
    const lesson = available[rows.length];
    const order = lesson?.order;
    const dateText = date.toISOString().slice(0, 10);
    rows.push({ key: dateText, excelRow: rows.length + 2, date: dateText, sourceClassId: classItem.id,
      startTime: form.startTime, endTime: form.endTime, roomId: form.roomId, outcome: "pending", serverMessage: "",
      lessonId: ownLessons.length ? lesson?.id : "planned-" + order, lessonTitle: lesson?.title || "Thiếu bài học",
      lessonOrder: order, newLesson: !ownLessons.length, description: lesson?.description || "" });
  }
  if (!rows.length) throw new Error("Khoảng ngày đã chọn không có ngày nào trùng các thứ học.");
  const newLessonCount = rows.filter(row => row.newLesson).length;
  if (rows.length < available.length) throw new Error("Khoảng ngày đã chọn chỉ có " + rows.length + " ngày học phù hợp, nhưng cần " + available.length + " buổi cho các bài chưa xếp lịch. Hãy tăng ngày kết thúc hoặc chọn thêm thứ học.");
  const expectedLessons = curriculum.map(lesson => ({ id: lesson.id, title: lesson.title, description: lesson.description, order: lesson.order }));
  return { rows, newLessonCount, issues: [], prepared: false, learningPathId: path.id, expectedLessons, courseId: classItem.courseId, coachId: classItem.coachId };
}

export function checkClassSchedulePlan(plan, context) {
  const planned = plan.rows.filter(row => row.newLesson).map(row => ({ id: row.lessonId, classId: context.classItem.id }));
  return validateImportRows(plan.rows, { ...context, lessons: [...context.lessons, ...planned] });
}

export function classScheduleFingerprint(plan) {
  return JSON.stringify([plan.courseId, plan.coachId, plan.learningPathId, plan.rows.map(row => [row.date, row.startTime, row.endTime, row.roomId, row.lessonId, row.lessonTitle, row.description, row.lessonOrder])]);
}
