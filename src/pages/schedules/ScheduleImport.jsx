import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { importSchedules, validateScheduleFile } from '../../api/schedule-import';
import { workspacePath } from '../../utils/url';
import Button from '../../components/common/Button';
import Screen from '../../components/common/Screen';

/** CENTER_MANAGER: bulk-create schedules from an .xlsx file. */
export default function ScheduleImport() {
  const { token } = useAuth();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function choose(event) {
    setError(''); setResult(null);
    const picked = event.target.files?.[0];
    if (!picked) return;
    try { validateScheduleFile(picked); setFile(picked); }
    catch (e) { setError(e.message); setFile(null); event.target.value = ''; }
  }

  async function upload() {
    if (!file || busy) return;
    setBusy(true); setError(''); setResult(null);
    try { setResult(await importSchedules(token, file)); }
    catch (e) { setError(`${e.message} Kiểm tra danh sách lịch trước khi thử lại để tránh nhập trùng.`); }
    finally { setBusy(false); setFile(null); if (input.current) input.current.value = ''; }
  }

  return (
    <Screen>
      <Link className="link" to={workspacePath('schedules')}>← Lịch tập</Link>
      <h1 className="title">Import lịch từ Excel</h1>
      <p className="body">Chọn tệp .xlsx tối đa 5 MB, tối đa 1000 dòng. Sheet đầu tiên cần các cột: <code>classId, lessonId, roomId, date, startTime, endTime</code>. Ngày dạng YYYY-MM-DD, giờ dạng HH:mm.</p>
      <section className="card stack">
        <label className="field">
          <span className="field-label">Tệp Excel</span>
          <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} disabled={busy} />
        </label>
        {file && <p className="body">{file.name} · {(file.size / 1024).toFixed(0)} KB. Các dòng hợp lệ sẽ được lưu ngay; dòng lỗi được báo riêng.</p>}
        <div><Button disabled={busy || !file} title={busy ? 'Đang nhập…' : 'Xác nhận nhập lịch'} onPress={upload} /></div>
      </section>
      {error && <p role="alert" className="error">{error}</p>}
      {result && (
        <section className="card">
          <h2 className="heading">Đã nhập {result.successCount}/{result.totalRows} dòng · {result.errorCount} lỗi</h2>
          {result.errors.map(item => <p key={`${item.row}:${item.message}`} className="error">Dòng {item.row}: {item.message}</p>)}
          <p className="body small">Không nhập lại toàn bộ tệp nếu đã có dòng thành công. Chỉ sửa và nhập những dòng lỗi.</p>
        </section>
      )}
    </Screen>
  );
}
