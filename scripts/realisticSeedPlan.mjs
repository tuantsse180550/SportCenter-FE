// Synthetic identities and curriculum; no credentials, ObjectIds or DB writes.
export const seedVersion = "sportcenter-realistic-v1";
export const accounts = [
  ["manager", "Nguyễn Minh Quân", "minh.quan", "CENTER_MANAGER"],
  ["reception-lan", "Trần Ngọc Lan", "ngoc.lan", "RECEPTIONIST"],
  ["reception-huy", "Lê Gia Huy", "gia.huy", "RECEPTIONIST"],
  ["yoga-basic", "Phạm Thu An", "thu.an", "COACH"],
  ["yoga-advanced", "Vũ Khánh Linh", "khanh.linh", "COACH"],
  ["boxing", "Đặng Quốc Bảo", "quoc.bao", "COACH"],
  ["muay-thai", "Hoàng Đức Khang", "duc.khang", "COACH"],
  ["badminton-basic", "Bùi Anh Duy", "anh.duy", "COACH"],
  ["badminton-advanced", "Đỗ Thanh Tùng", "thanh.tung", "COACH"],
  ["swimming", "Ngô Hải Nam", "hai.nam", "COACH"],
  ["pilates", "Dương Mai Chi", "mai.chi", "COACH"],
].map(([key, fullName, alias, role], index) => ({ key, fullName, email: alias + "@sportcenter.example.com", role, ...(role === "COACH" ? { phone: "000000" + String(index + 1).padStart(4, "0") } : {}) }));

const curricula = [
  ["yoga-basic", "Yoga", "Yoga nền tảng", 1200000, "người mới bắt đầu", "60 phút", "cải thiện độ linh hoạt, tư thế và thói quen hít thở", ["Nhịp thở và tư thế an toàn", "Linh hoạt khớp vai và cột sống", "Chuỗi đứng nền tảng", "Thăng bằng và kiểm soát cơ thể", "Mở hông và giãn cơ chân", "Chuyển động cùng nhịp thở", "Chuỗi thực hành toàn thân", "Ôn tập và hướng dẫn tự luyện"]],
  ["yoga-advanced", "Yoga", "Yoga phát triển sức bền", 1500000, "học viên đã có nền tảng Yoga", "60 phút", "tăng sức bền, ổn định vùng trung tâm và kiểm soát chuyển động", ["Đánh giá nền tảng và nhịp thở", "Ổn định vai và cơ trung tâm", "Chuỗi đứng tăng sức bền", "Cân bằng một chân", "Kỹ thuật chuyển tư thế", "Kiểm soát sức mạnh toàn thân", "Chuỗi thực hành nâng cao", "Tổng kết và kế hoạch duy trì"]],
  ["boxing", "Boxing", "Boxing Fitness", 1600000, "người mới bắt đầu", "75 phút", "nâng cao thể lực và phối hợp vận động qua kỹ thuật Boxing không đối kháng", ["Tư thế thủ và di chuyển", "Đấm thẳng và bảo vệ cổ tay", "Phối hợp đòn cơ bản", "Di chuyển và kiểm soát khoảng cách", "Luyện tập với đích đấm", "Chuỗi thể lực theo hiệp", "Phối hợp toàn thân", "Đánh giá kỹ thuật và thể lực"]],
  ["muay-thai", "Muay Thai", "Muay Thai căn bản", 1700000, "người mới bắt đầu", "75 phút", "rèn thể lực và làm quen kỹ thuật Muay Thai có kiểm soát, không đấu đối kháng", ["Tư thế và nguyên tắc an toàn", "Di chuyển và đấm cơ bản", "Kỹ thuật đá trên đích", "Kỹ thuật gối có kiểm soát", "Phối hợp tay và chân", "Nhịp độ và sức bền", "Chuỗi kỹ thuật tổng hợp", "Ôn tập và đánh giá nền tảng"]],
  ["badminton-basic", "Cầu lông", "Cầu lông nhập môn", 1300000, "người mới bắt đầu", "90 phút", "xây dựng cách cầm vợt, di chuyển và đánh cầu đúng kỹ thuật", ["Cầm vợt và tư thế chuẩn bị", "Di chuyển sáu điểm", "Giao cầu ngắn và dài", "Phông cầu cuối sân", "Bỏ nhỏ và lên lưới", "Phối hợp di chuyển và đánh cầu", "Luật thi đấu cơ bản", "Thực hành có hướng dẫn"]],
  ["badminton-advanced", "Cầu lông", "Cầu lông nâng cao kỹ thuật", 1600000, "học viên đã biết giao cầu và phông cầu", "90 phút", "cải thiện kỹ thuật tấn công, phòng thủ và phối hợp đánh đôi", ["Đánh giá kỹ thuật nền", "Bước chân và hồi vị", "Đập cầu có kiểm soát", "Phòng thủ và chuyển thế", "Điều cầu và chiến thuật", "Phối hợp đánh đôi", "Bài tập tình huống", "Thực hành và nhận xét kỹ thuật"]],
  ["swimming", "Bơi lội", "Bơi lội làm quen và nền tảng", 1800000, "người mới bắt đầu dưới sự giám sát trực tiếp", "60 phút", "làm quen môi trường nước và xây dựng kỹ năng thở, nổi, di chuyển cơ bản", ["An toàn hồ bơi và làm quen nước", "Thở nước và nổi có hỗ trợ", "Lướt nước và đạp chân", "Phối hợp tay cơ bản", "Phối hợp thở và di chuyển", "Duy trì nhịp vận động", "Thực hành quãng ngắn có giám sát", "Ôn tập kỹ năng an toàn"]],
  ["pilates", "Pilates", "Pilates nền tảng trên thảm", 1400000, "người mới bắt đầu", "60 phút", "cải thiện kiểm soát cơ trung tâm, tư thế và sự ổn định khi vận động", ["Nguyên tắc thở và căn chỉnh", "Kích hoạt cơ trung tâm", "Kiểm soát vùng chậu", "Ổn định vai và lưng", "Phối hợp chi và thân", "Chuỗi chuyển động trên thảm", "Thực hành toàn thân", "Đánh giá và hướng dẫn duy trì"]],
  ["zumba", "Zumba", "Zumba Fitness năng động", 1000000, "người mới bắt đầu", "60 phút", "tăng vận động tim mạch và phối hợp nhịp điệu qua bài tập theo nhạc", ["Nhịp điệu và khởi động", "Bước chân nền tảng", "Phối hợp tay và chân", "Kiểm soát cường độ", "Chuỗi động tác Latin cơ bản", "Bài tập tim mạch theo nhạc", "Ghép chuỗi vận động", "Tổng kết và giãn cơ"]],
  ["functional", "Functional Training", "Functional Training toàn thân", 1500000, "người mới bắt đầu", "60 phút", "rèn các mẫu vận động cơ bản và sức bền phục vụ sinh hoạt hằng ngày", ["Đánh giá và nguyên tắc an toàn", "Squat và hip hinge", "Đẩy và kéo có kiểm soát", "Ổn định cơ trung tâm", "Di chuyển và giữ thăng bằng", "Bài tập vòng toàn thân", "Phối hợp các mẫu vận động", "Đánh giá và kế hoạch duy trì"]],
];
export const courses = curricula.map(([key, subject, name, price, level, duration, goal, lessons]) => ({
  key, subject, name, price, status: "ACTIVE",
  description: "Chương trình 4 tuần, 8 buổi, mỗi buổi " + duration + ". Phù hợp: " + level + ". Mục tiêu: " + goal + ". Huấn luyện theo lộ trình tăng dần, ưu tiên kỹ thuật và an toàn.",
  lessons,
}));
export const classTemplates = [
  ["yoga-basic", "Yoga nền tảng · Tối thứ Hai và thứ Tư", [1, 3], "18:00", "19:00"],
  ["yoga-advanced", "Yoga sức bền · Tối thứ Ba và thứ Năm", [2, 4], "18:00", "19:00"],
  ["boxing", "Boxing Fitness · Tối thứ Hai và thứ Tư", [1, 3], "19:15", "20:30"],
  ["muay-thai", "Muay Thai căn bản · Tối thứ Ba và thứ Năm", [2, 4], "19:15", "20:30"],
  ["badminton-basic", "Cầu lông nhập môn · Sáng cuối tuần", [6, 7], "08:00", "09:30"],
  ["badminton-advanced", "Cầu lông nâng cao · Sáng cuối tuần", [6, 7], "09:45", "11:15"],
  ["swimming", "Bơi lội nền tảng · Chiều thứ Hai và thứ Tư", [1, 3], "17:00", "18:00"],
  ["pilates", "Pilates trên thảm · Chiều thứ Ba và thứ Năm", [2, 4], "17:00", "18:00"],
].map(([key, name, weekdays, startTime, endTime]) => ({ key, name, weekdays, startTime, endTime }));
export function nextMonday(today) {
  const date = new Date(today + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== today) throw new Error("INVALID_DATE");
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
  return date.toISOString().slice(0, 10);
}
export function buildPlan(startDate) {
  const start = new Date(startDate + "T00:00:00Z");
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startDate || start.getUTCDay() !== 1) throw new Error("START_MUST_BE_MONDAY");
  const classes = classTemplates.map(cls => {
    const sessions = [];
    for (let week = 0; week < 4; week++) for (const weekday of cls.weekdays) {
      const date = new Date(start); date.setUTCDate(date.getUTCDate() + week * 7 + weekday - 1);
      const day = date.toISOString().slice(0, 10);
      sessions.push({ day, date: new Date(day + "T" + cls.startTime + ":00+07:00").toISOString(), startTime: cls.startTime, endTime: cls.endTime, status: "SCHEDULED", lessonOrder: sessions.length + 1 });
    }
    return { ...cls, sessions };
  });
  return { version: seedVersion, startDate, timeZone: "Asia/Ho_Chi_Minh", accounts, courses, classes, subjects: [...new Set(courses.map(c => c.subject))] };
}
export function validatePlan(plan) {
  if (new Set(plan.courses.map(c => c.key)).size !== plan.courses.length || new Set(plan.courses.map(c => c.name)).size !== plan.courses.length || plan.courses.some(c => !Number.isFinite(c.price) || c.price <= 0 || !c.description || c.lessons.length !== 8)) throw new Error("INVALID_COURSE");
  if (new Set(plan.accounts.map(a => a.email)).size !== plan.accounts.length || new Set(plan.accounts.map(a => a.fullName)).size !== plan.accounts.length) throw new Error("DUPLICATE_IDENTITY");
  if (plan.accounts.some(a => !a.email.endsWith("@sportcenter.example.com") || !["CENTER_MANAGER", "RECEPTIONIST", "COACH"].includes(a.role))) throw new Error("UNSAFE_ACCOUNT");
  if (new Set(plan.classes.map(c => c.key)).size !== plan.classes.length) throw new Error("COACH_REUSED");
  const occupied = new Set();
  for (const cls of plan.classes) {
    const course = plan.courses.find(c => c.key === cls.key);
    if (!course || !plan.accounts.some(a => a.key === cls.key && a.role === "COACH") || course.lessons.length !== cls.sessions.length || !(course.price > 0)) throw new Error("INVALID_RELATION");
    for (const session of cls.sessions) {
      if (session.startTime >= session.endTime || Number.isNaN(new Date(session.date).getTime())) throw new Error("INVALID_TIME");
      const key = cls.key + ":" + session.date;
      if (occupied.has(key)) throw new Error("DUPLICATE_SCHEDULE");
      occupied.add(key);
      const local = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short", hour12: false }).format(new Date(session.date));
      if (!local.startsWith(session.day + " " + session.startTime)) throw new Error("TIMEZONE_MISMATCH");
    }
  }
  const sessions = plan.classes.flatMap(c => c.sessions);
  for (let i = 0; i < sessions.length; i++) for (let j = i + 1; j < sessions.length; j++) {
    const a = sessions[i], b = sessions[j];
    if (a.day === b.day && a.startTime < b.endTime && b.startTime < a.endTime) throw new Error("PLANNED_RESOURCE_OVERLAP");
  }
  return { accounts: plan.accounts.length, coaches: plan.accounts.filter(a => a.role === "COACH").length, courses: plan.courses.length, subjects: plan.subjects.length, learningPaths: plan.courses.length, classes: plan.classes.length, lessons: plan.courses.reduce((n, c) => n + c.lessons.length, 0), schedules: sessions.length, rooms: 0, members: 0, registrations: 0, payments: 0, attendances: 0 };
}
