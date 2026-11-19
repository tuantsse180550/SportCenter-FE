import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { catalogImportApi, validateCatalogFile } from '../../api/catalog-import';
import { workspacePath } from '../../utils/url';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';

const GROUPS = [
  ['courses', 'Khóa học', 'Khoa hoc', 'book', 'courses'],
  ['learningPaths', 'Lộ trình', 'Lo trinh', 'trend', 'learning-paths'],
  ['classes', 'Lớp học', 'Lop hoc', 'layers', 'classes'],
  ['lessons', 'Bài học', 'Bai hoc', 'file', 'lessons'],
];
const SHEET_LABEL = Object.fromEntries(GROUPS.map(([, label, sheet]) => [sheet, label]));

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CENTER_MANAGER: import courses, learning paths, classes and lessons from one Excel file. */
export default function CatalogImport() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function downloadTemplate() {
    setBusy('template'); setError('');
    try { saveBlob(await catalogImportApi.template(token), 'mau-nhap-khoa-hoc.xlsx'); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function check(picked) {
    setBusy('check'); setError(''); setReport(null);
    try { setReport(await catalogImportApi.run(token, picked, true)); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function choose(event) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    try { validateCatalogFile(picked); }
    catch (e) { setError(e.message); setFile(null); setReport(null); return; }
    setFile(picked);
    check(picked);
  }

  async function runImport() {
    if (!file || busy) return;
    setBusy('import'); setError('');
    try { setReport(await catalogImportApi.run(token, file, false)); }
    catch (e) { setReport(null); setError(e.message); }
    finally { setBusy(''); }
  }

  const reset = () => { setFile(null); setReport(null); setError(''); };
  const toCreate = report ? GROUPS.reduce((sum, [key]) => sum + report.summary[key].create, 0) : 0;
  const done = report?.imported;

  return (
    <>
      <PageHeading
        title="Nhập khóa học từ Excel"
        description="Tạo khóa học, lộ trình, lớp học và bài học cùng lúc từ một tệp Excel, liên kết với nhau bằng tên."
        back={{ to: workspacePath('courses'), label: 'Khóa học' }}
        actions={<Button secondary icon="download" disabled={!!busy} onPress={downloadTemplate}>{busy === 'template' ? 'Đang tải…' : 'Tải tệp mẫu'}</Button>}
      />

      <section className="card flush">
        <div className="card-heading"><h2>Cách nhập</h2></div>
        <ol className="import-steps">
          <li><b>Tải tệp mẫu.</b> Gồm 4 sheet Khoa hoc, Lo trinh, Lop hoc, Bai hoc và sheet Huong dan (có danh sách môn và HLV chưa có lớp).</li>
          <li><b>Điền dữ liệu bằng tên.</b> Ví dụ bài học ghi tên lớp và tên lộ trình, không cần mã ID. Sheet nào không dùng thì để trống.</li>
          <li><b>Thêm video nếu có.</b> Điền cột <code>Link video</code> trong sheet <code>Bai hoc</code> cho bài học mới. Dùng link HTTPS của YouTube, Vimeo hoặc Google Drive để phát ngay trên web.</li>
          <li><b>Chọn tệp để kiểm tra.</b> Hệ thống báo trước dòng nào sẽ tạo mới, dòng nào đã có (bỏ qua) và dòng nào lỗi.</li>
          <li><b>Bấm Nhập.</b> Chỉ nhập khi không còn lỗi; tất cả được ghi cùng lúc, nếu có sự cố thì không ghi gì.</li>
        </ol>
      </section>

      <section className="card import-drop">
        <span className="metric-icon orange"><Icon name="upload" size={22} /></span>
        <div>
          <b>{file ? file.name : 'Chưa chọn tệp'}</b>
          <small>{file ? `${(file.size / 1024).toFixed(0)} KB · .xlsx` : 'Tệp .xlsx tối đa 5 MB, tối đa 1000 dòng.'}</small>
        </div>
        <input ref={input} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} />
        <div className="row-actions">
          {file && !done && <Button secondary small icon="repeat" disabled={!!busy} onPress={() => check(file)}>Kiểm tra lại</Button>}
          <Button small icon="file" disabled={!!busy} onPress={() => input.current?.click()}>{file ? 'Chọn tệp khác' : 'Chọn tệp Excel'}</Button>
        </div>
      </section>

      {busy === 'check' && <p className="loading" role="status"><span className="spinner" aria-hidden="true" /> Đang kiểm tra tệp…</p>}
      {busy === 'import' && <p className="loading" role="status"><span className="spinner" aria-hidden="true" /> Đang nhập dữ liệu…</p>}
      {error && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>{error}</p></div>}

      {report && (
        <>
          {done ? (
            <div className="alert-box green" role="status">
              <Icon name="checkCircle" size={19} />
              <p><b>Đã nhập xong.</b> {GROUPS.filter(([key]) => report.summary[key].create).map(([key, label]) => `${report.summary[key].create} ${label.toLowerCase()}`).join(', ')} đã được tạo.</p>
            </div>
          ) : !report.valid ? (
            <div className="alert-box red" role="alert">
              <Icon name="alert" size={19} />
              <p><b>{report.errors.length} dòng lỗi, chưa nhập dữ liệu nào.</b> Sửa các dòng bên dưới trong Excel rồi chọn lại tệp.</p>
            </div>
          ) : toCreate ? (
            <div className="alert-box blue" role="status">
              <Icon name="checkCircle" size={19} />
              <p><b>Tệp hợp lệ.</b> Sẽ tạo {toCreate} mục mới. Kiểm tra danh sách rồi bấm Nhập.</p>
            </div>
          ) : (
            <div className="alert-box amber" role="status"><Icon name="help" size={19} /><p>Mọi dòng trong tệp đã có trên hệ thống, không có gì mới để nhập.</p></div>
          )}

          <div className="metric-grid">
            {GROUPS.map(([key, label, , icon, resource]) => {
              const item = report.summary[key];
              return (
                <button type="button" key={key} className="metric-card" onClick={() => navigate(workspacePath(resource))}>
                  <div className="metric-label">{label}<span className="metric-icon"><Icon name={icon} size={19} /></span></div>
                  <strong>{item.create}</strong>
                  <small>{done ? 'đã tạo' : 'sẽ tạo mới'} · {item.skip} đã có{item.error ? ` · ${item.error} lỗi` : ''}</small>
                </button>
              );
            })}
          </div>

          {report.errors.length > 0 && (
            <section className="card flush">
              <div className="card-heading"><h2>Dòng cần sửa</h2><span className="subtle-tag">{report.errors.length} lỗi</span></div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>SHEET</th><th>DÒNG</th><th>LỖI</th></tr></thead>
                  <tbody>
                    {report.errors.map(item => (
                      <tr key={`${item.sheet}:${item.row}:${item.message}`}>
                        <td><b>{SHEET_LABEL[item.sheet] || item.sheet}</b><small>Sheet “{item.sheet}”</small></td>
                        <td>{item.row}</td>
                        <td className="danger-text">{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {report.rows.length > 0 && (
            <section className="card flush">
              <div className="card-heading"><h2>Dòng hợp lệ</h2><span className="subtle-tag">{report.rows.length} dòng</span></div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>SHEET</th><th>DÒNG</th><th>NỘI DUNG</th><th>KẾT QUẢ</th></tr></thead>
                  <tbody>
                    {report.rows.map(item => (
                      <tr key={`${item.sheet}:${item.row}`}>
                        <td>{SHEET_LABEL[item.sheet] || item.sheet}</td>
                        <td>{item.row}</td>
                        <td><b>{item.label}</b></td>
                        <td>
                          {item.action === 'create'
                            ? <Badge tone="green">{done ? 'Đã tạo' : 'Tạo mới'}</Badge>
                            : <Badge tone="blue">Đã có · bỏ qua</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="row-actions">
            {done
              ? <Button icon="plus" onPress={reset}>Nhập tệp khác</Button>
              : <Button icon="upload" disabled={!!busy || !report.valid || !toCreate} onPress={runImport}>{busy === 'import' ? 'Đang nhập…' : `Nhập ${toCreate} mục`}</Button>}
            <Button secondary onPress={() => navigate(workspacePath('courses'))}>Xem danh sách khóa học</Button>
          </div>
        </>
      )}
    </>
  );
}
