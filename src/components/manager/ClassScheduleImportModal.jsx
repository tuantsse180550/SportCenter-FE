import { useState } from "react";
import { Badge, Button, Modal, SelectField } from "../common/UI.jsx";
import { AsyncPanel } from "../common/AsyncPanel.jsx";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { loadClassScheduleContext, saveClassSchedulePlan } from "../../services/api/classScheduleImport.js";
import { buildClassSchedulePlan, checkClassSchedulePlan, classScheduleFingerprint } from "./classSchedulePlan.js";
import { importErrorMessage, mapImportResult } from "./scheduleImportLogic.js";
import { formatters } from "../../utils/formatters.js";
import { idOf } from "../../services/api/normalize.js";
import { errorText } from "../../utils/vietnamese.js";
import "./class-schedule-import.css";

const weekdays = [[1, "Thứ Hai"], [2, "Thứ Ba"], [3, "Thứ Tư"], [4, "Thứ Năm"], [5, "Thứ Sáu"], [6, "Thứ Bảy"], [0, "Chủ nhật"]];

function ClassScheduleForm({ context, onPending, onClose, onImported }) {
  const paths = context.paths.filter(path => idOf(path.courseId) === context.classItem.courseId);
  const defaultPath = idOf(context.lessons[0]?.learningPathId) || (paths.length === 1 ? paths[0].id : "");
  const [form, setForm] = useState({ startDate: "", endDate: "", startTime: "", endTime: "", weekdays: [], roomId: "", learningPathId: defaultPath });
  const [plan, setPlan] = useState(null);
  const [runtimeContext, setRuntimeContext] = useState(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const mutation = useMutation();
  const current = runtimeContext || context;
  const rows = plan ? checkClassSchedulePlan(plan, current) : [];
  const remaining = rows.filter(row => row.outcome !== "success");
  const invalid = remaining.some(row => row.issues.length) || !!plan?.issues.length;
  const set = (key, value) => {
    setForm(old => ({ ...old, [key]: value })); setPlan(null); setSummary(null); setMessage(""); setUncertain(false);
  };
  const toggleDay = day => set("weekdays", form.weekdays.includes(day) ? form.weekdays.filter(value => value !== day) : [...form.weekdays, day]);
  const preview = event => {
    event.preventDefault(); setMessage(""); setSummary(null); setUncertain(false);
    try { setPlan(buildClassSchedulePlan(form, current)); }
    catch (error) { setPlan(null); setMessage(error.message); }
  };
  const submit = () => {
    if (!plan || mutation.pending || uncertain || invalid || !remaining.length) return;
    onPending(true); setMessage("");
    let postStarted = false;
    mutation.run(async () => {
      try {
        const fresh = await loadClassScheduleContext(context.classItem.id);
        setRuntimeContext(fresh);
        const ready = buildClassSchedulePlan(form, fresh);
        if (classScheduleFingerprint(ready) !== classScheduleFingerprint(plan)) {
          setPlan(ready); setMessage("Bài học hoặc thông tin lớp vừa thay đổi. Kiểm tra bản xem trước mới rồi xác nhận lại."); return;
        }
        const checked = checkClassSchedulePlan(ready, fresh).filter(row => row.outcome !== "success");
        if (checked.some(row => row.issues.length)) {
          setPlan(ready); setMessage("Phòng, lớp hoặc HLV đã có thay đổi. Vui lòng kiểm tra các dòng lỗi."); return;
        }
        postStarted = true;
        const result = await saveClassSchedulePlan(ready, fresh);
        if (result?.successCount !== checked.length || result?.errorCount !== 0) throw new Error("Kết quả tạo lịch không đầy đủ. Hãy kiểm tra lịch của lớp trước khi thử lại.");
        const outcomes = mapImportResult(result, checked);
        setPlan({ ...ready, prepared: true, rows: ready.rows.map(row => outcomes.has(row.key) ? { ...row, ...outcomes.get(row.key) } : row) });
        setSummary({ success: result.successCount, errors: result.errorCount });
        onImported?.(result);
      } catch (error) {
        const reason = /[À-ỹ]/u.test(error.message || "") ? error.message :
          error.status || error.code ? errorText(error.message, error) : error.message;
        if (postStarted && (!error.status || error.code === "INVALID_RESPONSE")) {
          setUncertain(true);
          setMessage("Chưa nhận được kết quả xác nhận từ máy chủ. Đóng form và kiểm tra mục Buổi học trước khi thử lại. " + reason);
        } else {
          setMessage("Chưa tạo được lịch học. " + reason);
        }
      }
    }).finally(() => onPending(false));
  };
  return <>
    <p>Lớp: <strong>{current.classItem.name}</strong>. Chọn khoảng ngày, các thứ học, giờ và phòng để tạo nhiều buổi.</p>
    <form onSubmit={preview}>
      <fieldset className="class-schedule-fields" disabled={mutation.pending || uncertain}>
        <SelectField label="Lộ trình / giáo án khóa học" value={form.learningPathId} disabled={mutation.pending || uncertain} onChange={value => set("learningPathId", value)}>
          <option value="">Chọn lộ trình</option>{paths.map(path => <option key={path.id} value={path.id}>{path.name}</option>)}
        </SelectField>
        {[["startDate", "Ngày bắt đầu", "date"], ["endDate", "Ngày kết thúc", "date"], ["startTime", "Giờ bắt đầu", "time"], ["endTime", "Giờ kết thúc", "time"]].map(([key, label, type]) =>
          <label className="field" key={key}><span>{label}</span><input required type={type} value={form[key]} onChange={event => set(key, event.target.value)} /></label>)}
        <SelectField label="Phòng học" disabled={mutation.pending || uncertain} value={form.roomId} onChange={value => set("roomId", value)}>
          <option value="">Chọn phòng đang hoạt động</option>{current.rooms.filter(room => room.status === "ACTIVE").map(room => <option key={room.id} value={room.id}>{room.roomNumber} · {room.name}</option>)}
        </SelectField>
      </fieldset>
      <fieldset className="class-schedule-weekdays" disabled={mutation.pending || uncertain}>
        <legend>Các thứ học hằng tuần</legend>
        {weekdays.map(([day, label]) => <label key={day}><input type="checkbox" checked={form.weekdays.includes(day)} onChange={() => toggleDay(day)} />{label}</label>)}
      </fieldset>
      <p>Giáo án được lấy từ lộ trình của khóa học và sao chép riêng cho lớp. Ngày kết thúc là giới hạn: hệ thống lấy các ngày học phù hợp từ ngày bắt đầu và dừng khi đủ số bài chưa xếp lịch. Nếu chưa có giáo án, đóng form và chọn “Quản lý giáo án khóa học”.</p>
      <Button type="submit" variant="secondary" disabled={mutation.pending || uncertain}>Xem trước lịch học</Button>
    </form>
    {message && <p className="form-error" role="alert">{message}</p>}
    {plan && <>
      <h3>Bản xem trước · {rows.length} buổi học</h3>
      {!!rows.length && <p>Buổi đầu: {formatters.date(rows[0].date)} · Buổi cuối dự kiến: {formatters.date(rows[rows.length - 1].date)}</p>}
      {!plan.prepared && <p>Sẽ dùng {rows.length - plan.newLessonCount} bài học của lớp và sao chép {plan.newLessonCount} bài từ giáo án mẫu. Chưa lưu dữ liệu cho đến khi xác nhận.</p>}
      {plan.issues.map(issue => <p className="form-error" role="alert" key={issue}>{issue}</p>)}
      {summary && <p role="status">Đã tạo thành công {summary.success} buổi học. Nội dung và lịch đã được lưu; lịch hiển thị tại mục “Buổi học” của lớp.</p>}
      <div className="class-schedule-preview"><table>
        <thead><tr><th>Ngày học</th><th>Giờ học</th><th>Bài học</th><th>Kết quả</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}>
          <td>{formatters.date(row.date)}</td><td>{row.startTime}–{row.endTime}</td>
          <td><strong>Buổi {row.lessonOrder}: {row.lessonTitle}</strong><p style={{ whiteSpace: "pre-wrap" }}>{row.description}</p></td>
          <td>{row.outcome === "success" ? <Badge>Đã tạo lịch</Badge> : row.issues.length || row.serverMessage ?
            <ul className="form-error">{row.issues.map(issue => <li key={issue}>{issue}</li>)}{row.serverMessage && <li>{importErrorMessage(row.serverMessage)}</li>}</ul> : "Sẵn sàng"}</td>
        </tr>)}</tbody>
      </table></div>
      <p>Nội dung và lịch học được lưu cùng lúc khi xác nhận. Nội dung xuất hiện tại “Nội dung học của lớp”, lịch xuất hiện tại “Buổi học”. Chỉnh bài mẫu sau này không thay đổi nội dung đã sao chép.</p>
      <div className="class-actions">
        <Button disabled={mutation.pending || invalid || uncertain || !remaining.length} onClick={submit}>{mutation.pending ? "Đang sao chép giáo án và tạo lịch..." : "Xác nhận tạo " + remaining.length + " buổi học"}</Button>
        <Button disabled={mutation.pending} variant="secondary" onClick={onClose}>{remaining.length ? "Đóng" : "Hoàn tất"}</Button>
      </div>
    </>}
  </>;
}

export function ClassScheduleImportModal({ classId, onClose, onImported }) {
  const query = useQuery(() => loadClassScheduleContext(classId), [classId]);
  const [pending, setPending] = useState(false);
  return <Modal title="Import lịch học của lớp" onClose={pending ? () => {} : onClose}>
    <AsyncPanel query={query}>{context => <ClassScheduleForm key={classId} context={context} onPending={setPending} onClose={onClose} onImported={onImported} />}</AsyncPanel>
  </Modal>;
}
