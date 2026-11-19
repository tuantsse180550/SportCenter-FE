// Same rules as the mobile app (src/utils/exercise-suggest.ts).
const LEVEL_DOSE = {
    BEGINNER: { sets: '2 hiệp × 8–10 lần', minutes: '15–20 phút', rest: 'nghỉ 60–90 giây', label: 'mới bắt đầu' },
    INTERMEDIATE: { sets: '3 hiệp × 10–12 lần', minutes: '25–30 phút', rest: 'nghỉ 45–60 giây', label: 'trung cấp' },
    ADVANCED: { sets: '4 hiệp × 12–15 lần', minutes: '35–45 phút', rest: 'nghỉ 30–45 giây', label: 'nâng cao' },
};
const normalize = (text = '') => text.toLocaleLowerCase('vi').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const SPORT_DRILLS = [
    { keys: ['bong ban', 'table tennis'], name: 'Bóng bàn', drills: ['Tập bóng vào bàn: thuận tay giao bóng ngắn, đổi góc', 'Đánh bóng thuận tay – trái tay liên tục theo đường chéo', 'Di chuyển bước đơn ngang bàn kết hợp vung vợt không bóng'] },
    { keys: ['cau long', 'badminton'], name: 'Cầu lông', drills: ['Di chuyển sáu điểm có cầu mồi', 'Đánh cầu cao sâu cuối sân', 'Bỏ nhỏ và chặn lưới theo cặp'] },
    { keys: ['yoga'], name: 'Yoga', drills: ['Chuỗi chào mặt trời (Surya Namaskar)', 'Giữ tư thế chiến binh I–II, cây, tam giác', 'Thở bụng và giãn cột sống cuối buổi'] },
    { keys: ['pilates'], name: 'Pilates', drills: ['The Hundred', 'Roll-up và single-leg stretch', 'Plank kiểm soát hông'] },
    { keys: ['boxing', 'quyen anh'], name: 'Boxing', drills: ['Shadow boxing 3 hiệp × 2 phút', 'Đấm bao: jab–cross–hook theo combo', 'Né đầu và di chuyển chân với dây'] },
    { keys: ['boi', 'swim'], name: 'Bơi lội', drills: ['Đạp chân với phao bảng', 'Bơi sải kỹ thuật thở 3 nhịp', 'Bơi ngắt quãng 25 m × nhiều lượt'] },
    { keys: ['bong chay', 'baseball'], name: 'Bóng chày', drills: ['Ném – bắt bóng theo cặp tăng dần khoảng cách', 'Vung gậy trên giá đỡ (tee)', 'Chạy chốt và trượt về gôn'] },
    { keys: ['bong da', 'football', 'soccer'], name: 'Bóng đá', drills: ['Dẫn bóng qua cọc', 'Chuyền – nhận bóng hai chạm', 'Sút cầu môn sau một chạm'] },
    { keys: ['gym', 'the hinh', 'suc manh'], name: 'Gym', drills: ['Squat', 'Đẩy ngực / hít đất', 'Kéo xà hoặc kéo cáp'] },
];
const GOAL_FOCUS = [
    { keys: ['giam can', 'giam mo', 'dot mo', 'eo', 'beo', 'can nang'], focus: 'Đốt mỡ, giảm cân', exercises: ['Cardio cường độ ngắt quãng (HIIT): 30 giây nhanh / 30 giây chậm', 'Burpee hoặc jumping jack', 'Đi bộ nhanh / đạp xe nhẹ cuối buổi'] },
    { keys: ['suc ben', 'ben bi', 'the luc', 'cardio', 'tim mach'], focus: 'Tăng sức bền', exercises: ['Chạy nhẹ hoặc nhảy dây liên tục', 'Circuit 5 bài liên tiếp, ít nghỉ', 'Bài tập nhịp tim vùng 2'] },
    { keys: ['tang co', 'co bap', 'suc manh', 'khoe', 'tang can'], focus: 'Tăng sức mạnh, cơ bắp', exercises: ['Squat / lunge', 'Hít đất hoặc đẩy tạ', 'Plank và gập bụng có kiểm soát'] },
    { keys: ['deo', 'linh hoat', 'gian co', 'co dan', 'tu the', 'cot song', 'thu gian', 'stress'], focus: 'Linh hoạt, thư giãn', exercises: ['Giãn cơ động khởi động', 'Giãn cơ tĩnh hông – đùi sau – vai', 'Thở sâu 5 phút'] },
    { keys: ['ky thuat', 'thi dau', 'nang cao', 'chuyen sau'], focus: 'Hoàn thiện kỹ thuật', exercises: ['Lặp lại động tác kỹ thuật chậm, có quay video', 'Bài tập phản xạ theo tín hiệu', 'Đấu tập có mục tiêu'] },
];
/** Prefix the chosen session so a workout result shows which session it belongs to. */
export const withSessionNote = (result, session) => session ? `[${session}] ${result}` : result;
export function suggestExercises(input) {
    const level = input.level === 'ADVANCED' || input.level === 'INTERMEDIATE' ? input.level : 'BEGINNER';
    const dose = LEVEL_DOSE[level];
    const subjectKey = normalize(input.subject);
    const goalKey = normalize(input.goal);
    const sport = SPORT_DRILLS.find(item => item.keys.some(key => subjectKey.includes(key)));
    const goals = GOAL_FOCUS.filter(item => item.keys.some(key => goalKey.includes(key)));
    const focus = goals.length ? goals.map(item => item.focus) : ['Thể lực chung'];
    const history = input.history || { results: 0 };
    const lines = [];
    lines.push(`Mục tiêu: ${input.goal?.trim() || 'chưa ghi — tập trung thể lực chung'} · Trình độ: ${dose.label}${sport ? ` · Môn: ${sport.name}` : ''}`);
    lines.push('');
    lines.push(`1. Khởi động (8–10 phút): xoay khớp, chạy nhẹ tại chỗ, giãn cơ động.`);
    if (sport)
        lines.push(`2. Kỹ thuật ${sport.name} (${dose.minutes}):`, ...sport.drills.map(drill => `   - ${drill}`));
    const goalExercises = (goals.length ? goals : [{ focus: 'Thể lực chung', exercises: ['Squat', 'Hít đất (có thể chống gối)', 'Plank 20–40 giây'], keys: [] }]).flatMap(item => item.exercises).slice(0, 4);
    lines.push(`${sport ? 3 : 2}. Bài tập theo mục tiêu (${dose.sets}, ${dose.rest}):`, ...goalExercises.map(exercise => `   - ${exercise}`));
    lines.push(`${sport ? 4 : 3}. Thả lỏng (5–8 phút): giãn cơ tĩnh, hít thở sâu.`);
    lines.push('');
    if (!history.results)
        lines.push('Lịch sử: chưa có kết quả tập trước đó → buổi đầu dùng để đánh giá đầu vào, ghi lại số lần/thời gian làm được.');
    else {
        lines.push(`Lịch sử: đã có ${history.results} kết quả tập → tăng khoảng 10% khối lượng (thêm 1–2 lần mỗi hiệp hoặc thêm 1 hiệp) nếu buổi trước hoàn thành tốt.`);
        if (history.lastResult)
            lines.push(`Kết quả gần nhất: ${history.lastResult.trim().slice(0, 160)}`);
        if (history.lastComment)
            lines.push(`Lưu ý từ HLV: ${history.lastComment.trim().slice(0, 160)}`);
    }
    if (history.sessions && history.absences && history.absences / history.sessions >= 0.3)
        lines.push(`Chuyên cần: vắng ${history.absences}/${history.sessions} buổi → giữ cường độ vừa phải, ôn lại bài cũ trước khi tăng tải.`);
    if (input.forClass)
        lines.push('Kế hoạch chung cho cả lớp: chia nhóm theo trình độ, học viên mới giảm 1 hiệp.');
    return { focus, text: lines.join('\n') };
}
