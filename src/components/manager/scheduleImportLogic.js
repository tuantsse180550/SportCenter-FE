import { idOf } from "../../services/api/normalize.js";

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeTime(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || value >= 1) return "";
    const minutes = Math.round(value * 1440);
    if (minutes >= 1440 || Math.abs(value * 86400 - minutes * 60) > 0.01) return "";
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})(?::00)?$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "";
  return match[1].padStart(2, "0") + ":" + match[2];
}

const overlap = (a, b) => a.date === b.date && a.startTime < b.endTime && a.endTime > b.startTime;
const timeValid = row => validDate(row.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.startTime) &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(row.endTime) && row.startTime < row.endTime;

export function validateImportRows(rows, { classItem, lessons, rooms, sessions }) {
  const lessonIds = new Set(lessons.filter(lesson => idOf(lesson.classId) === classItem?.id).map(lesson => lesson.id));
  const activeRooms = new Set(rooms.filter(room => room.status === "ACTIVE").map(room => room.id));
  const successes = rows.filter(row => row.outcome === "success").map(row => ({ ...row, classId: classItem?.id, status: "SCHEDULED" }));
  const existing = [...sessions, ...successes].filter(session => session.status !== "CANCELLED");
  return rows.map(row => {
    if (row.outcome === "success") return { ...row, issues: [] };
    const issues = [];
    if (!classItem || row.sourceClassId !== classItem.id) issues.push("Dòng này không thuộc lớp đã chọn. Hãy dùng mẫu đúng lớp.");
    if (!lessonIds.has(row.lessonId)) issues.push("Chọn bài học thuộc lớp này.");
    if (!activeRooms.has(row.roomId)) issues.push("Chọn phòng đang hoạt động.");
    if (!validDate(row.date)) issues.push("Ngày chưa hợp lệ. Chọn ngày học hoặc điền YYYY-MM-DD trong Excel.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.startTime)) issues.push("Giờ bắt đầu chưa hợp lệ, cần dạng HH:mm.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.endTime)) issues.push("Giờ kết thúc chưa hợp lệ, cần dạng HH:mm.");
    if (row.startTime && row.endTime && row.startTime >= row.endTime) issues.push("Giờ kết thúc phải sau giờ bắt đầu.");
    if (timeValid(row)) {
      const conflict = existing.find(session => overlap(row, session) &&
        (session.roomId === row.roomId || session.classId === classItem?.id ||
          (classItem?.coachId && session.coachId === classItem.coachId)));
      if (conflict) issues.push(conflict.roomId === row.roomId ? "Phòng đã có lịch trùng thời gian." : "Lớp hoặc HLV đã có lịch trùng thời gian.");
      const other = rows.find(candidate => candidate.key !== row.key && candidate.outcome !== "success" && timeValid(candidate) && overlap(row, candidate));
      if (other) issues.push("Trùng thời gian với dòng " + other.excelRow + " trong file.");
    }
    return { ...row, issues };
  });
}

export function mapImportResult(data, submitted) {
  if (!Number.isInteger(data?.successCount) || !Number.isInteger(data?.errorCount) ||
      data.successCount < 0 || data.errorCount < 0 || data.totalRows !== submitted.length ||
      data.successCount + data.errorCount !== submitted.length ||
      !Array.isArray(data.importedSchedules) || !Array.isArray(data.errors) ||
      data.importedSchedules.length !== data.successCount || data.errors.length !== data.errorCount) {
    throw new Error("Kết quả import không hợp lệ. Kiểm tra lịch đã lưu trước khi thử lại.");
  }
  const results = new Map();
  for (const [outcome, records] of [["success", data.importedSchedules], ["error", data.errors]]) {
    for (const record of records) {
      if (!Number.isInteger(record.row) || record.row < 2 || record.row > submitted.length + 1 ||
          (outcome === "success" && (typeof record.scheduleId !== "string" || !record.scheduleId)) ||
          (outcome === "error" && typeof record.message !== "string")) throw new Error("Kết quả từng dòng không hợp lệ.");
      const key = submitted[record.row - 2].key;
      if (results.has(key)) throw new Error("Kết quả import bị lặp dòng.");
      results.set(key, { outcome, serverMessage: outcome === "error" ? record.message : "", scheduleId: record.scheduleId });
    }
  }
  return results;
}

export function importErrorMessage(message) {
  const labels = {
    "Room has an overlapping schedule": "Phòng đã có lịch trùng thời gian.",
    "The selected room is not active": "Phòng đã ngừng hoạt động.",
    "The selected lesson does not belong to the selected class.": "Bài học không thuộc lớp đã chọn.",
    "Room not found": "Không tìm thấy phòng.", "Lesson not found": "Không tìm thấy bài học.",
    "Class not found": "Không tìm thấy lớp.", "Failed to import this row": "Chưa nhập được dòng này. Vui lòng kiểm tra lại.",
  };
  return labels[message] || message;
}
