import { write, utils } from "xlsx";

export function createBackendWorkbook(rows, classId) {
  const sheet = utils.aoa_to_sheet([
    ["classId", "lessonId", "roomId", "date", "startTime", "endTime", "status"],
    ...rows.map(row => [classId, row.lessonId, row.roomId, row.date, row.startTime, row.endTime, "SCHEDULED"]),
  ]);
  const workbook = utils.book_new(); utils.book_append_sheet(workbook, sheet, "Schedules");
  return write(workbook, { type: "array", bookType: "xlsx", compression: true });
}
