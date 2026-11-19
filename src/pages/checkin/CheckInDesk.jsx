import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { checkInActionLabel, checkInApi, clockTime, secondsLeft } from '../../api/checkin';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';

const SCAN_EVERY_MS = 250;
const staffName = user => (user?.email ? String(user.email).split('@')[0] : '');

/**
 * Front desk: scan a member's QR (camera, or a handheld scanner typing into the field), check who it
 * is, then confirm entry or exit. Scanning alone records nothing; the code is used on confirm.
 */
export default function CheckInDesk() {
  const { token } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const confirmingRef = useRef(false);
  const [camera, setCamera] = useState('off'); // off | starting | on
  const [manual, setManual] = useState('');
  const [scanned, setScanned] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const loadVisits = useCallback(() => checkInApi.visits(token), [token]);
  const visits = useApiQuery(loadVisits);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCamera('off');
  }, []);

  const lookUp = useCallback(async code => {
    const value = String(code || '').trim();
    if (!value) return;
    setBusy(true); setError(''); setResult(''); setPreview(null); setScanned(value);
    try { setPreview(await checkInApi.preview(token, value)); setNow(Date.now()); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [token]);

  // Read frames while the camera is on; the first QR found is looked up and the camera stops.
  useEffect(() => {
    if (camera !== 'on') return undefined;
    const timer = setInterval(() => {
      const video = videoRef.current; const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
      if (found?.data) { stopCamera(); lookUp(found.data); }
    }, SCAN_EVERY_MS);
    return () => clearInterval(timer);
  }, [camera, lookUp, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  // Countdown of the scanned code's validity.
  useEffect(() => {
    if (!preview) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [preview]);

  async function startCamera() {
    setError(''); setCamera('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamera('on');
    } catch {
      setCamera('off');
      setError('Không mở được camera. Cho phép trình duyệt dùng camera, hoặc dùng máy quét/nhập mã bên dưới.');
    }
  }

  async function confirm() {
    // A ref, not state: a double click fires twice before React re-renders with busy=true.
    if (!preview || confirmingRef.current) return;
    confirmingRef.current = true;
    setBusy(true); setError('');
    try {
      const done = await checkInApi.confirm(token, scanned, preview.nextAction);
      const name = done.visit?.member?.fullName || preview.member.fullName;
      const when = clockTime(done.action === 'OUT' ? done.visit.checkedOutAt : done.visit.checkedInAt);
      setResult(`${done.action === 'OUT' ? 'Đã xác nhận ra' : 'Đã xác nhận vào'}: ${name} lúc ${when}${done.alreadyRecorded ? ' (đã ghi trước đó)' : ''}.`);
      setPreview(null); setScanned(''); setManual('');
      visits.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      confirmingRef.current = false;
      setBusy(false);
    }
  }

  function reset() { setPreview(null); setScanned(''); setManual(''); setError(''); setResult(''); }

  const left = preview ? secondsLeft(preview.tokenExpiresAt, now) : 0;
  const inside = (visits.data?.visits || []).filter(visit => visit.status === 'OPEN');

  return (
    <>
      <PageHeading title="Quét QR ra/vào" description="Quét mã của hội viên, đối chiếu thông tin rồi bấm xác nhận. Chỉ quét thì chưa ghi nhận lượt." />
      <div className="desk-grid">
        <section className="card desk-scan">
          <div className={`desk-video${camera === 'on' ? ' live' : ''}`}>
            <video ref={videoRef} muted playsInline aria-label="Camera quét mã QR" />
            {camera !== 'on' && <div className="desk-video-idle"><Icon name="scan" size={36} /><span>{camera === 'starting' ? 'Đang mở camera…' : 'Camera đang tắt'}</span></div>}
            <canvas ref={canvasRef} hidden />
          </div>
          <div className="row-actions">
            {camera === 'on'
              ? <Button secondary icon="close" onPress={stopCamera}>Tắt camera</Button>
              : <Button icon="scan" disabled={camera === 'starting'} onPress={startCamera}>Quét bằng camera</Button>}
          </div>
          <form className="desk-manual" onSubmit={event => { event.preventDefault(); lookUp(manual); }}>
            <label htmlFor="desk-code">Máy quét cầm tay / dán mã</label>
            <div>
              <input id="desk-code" value={manual} onChange={event => setManual(event.target.value)} placeholder="Quét hoặc dán mã rồi nhấn Enter" autoComplete="off" />
              <Button type="submit" secondary disabled={busy || !manual.trim()}>Tra cứu</Button>
            </div>
          </form>
        </section>

        <section className="card desk-result" aria-live="polite">
          {result && <div className="alert-box green" role="status"><Icon name="checkCircle" size={18} /><p>{result}</p></div>}
          {error && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>{error}</p></div>}
          {busy && !preview && <p className="body">Đang tra cứu mã…</p>}
          {!preview && !busy && !error && !result && <Empty text="Chưa có mã nào được quét" detail="Thông tin hội viên hiện ở đây để lễ tân đối chiếu trước khi xác nhận." icon="qr" />}
          {preview && (
            <>
              <div className="desk-member">
                <span className="desk-avatar">{preview.member.fullName.split(/\s+/).slice(-1)[0]?.[0] || '?'}</span>
                <div>
                  <h2>{preview.member.fullName}</h2>
                  <span>{preview.member.phone || 'Chưa có số điện thoại'}</span>
                </div>
                <span className={`badge ${preview.openVisit ? 'green' : 'blue'}`}><i />{preview.openVisit ? `Đang ở trung tâm từ ${clockTime(preview.openVisit.checkedInAt)}` : 'Đang ở ngoài'}</span>
              </div>
              <div className="desk-regs">
                {preview.registrations.length
                  ? preview.registrations.map(item => (
                    <div key={item.id} className="pass-row">
                      <div><b>{item.className}</b><span>{[item.subjectName, item.courseName].filter(Boolean).join(' · ')}</span></div>
                      <span className={`badge ${item.status === 'PENDING_PAYMENT' ? 'amber' : item.active ? 'green' : 'muted'}`}><i />{item.label}</span>
                    </div>
                  ))
                  : <p className="body">Hội viên chưa đăng ký lớp nào.</p>}
              </div>
              {!preview.allowed && <div className="alert-box amber" role="alert"><Icon name="alert" size={18} /><p>{preview.message}</p></div>}
              <p className="body small">{left ? `Mã còn hiệu lực ${left} giây.` : 'Mã đã hết hạn, nhờ hội viên lấy mã mới.'}</p>
              <div className="row-actions">
                <Button icon={preview.nextAction === 'OUT' ? 'logout' : 'checkCircle'} disabled={busy || !preview.allowed || !left} onPress={confirm}>
                  {busy ? 'Đang xác nhận…' : checkInActionLabel(preview.nextAction)}
                </Button>
                <Button secondary onPress={reset}>Quét mã khác</Button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card flush">
        <div className="card-heading">
          <h2>Lượt ra/vào hôm nay <span className="subtle-tag">{inside.length} người đang ở trung tâm</span></h2>
          <Button secondary small icon="repeat" onPress={visits.reload}>Làm mới</Button>
        </div>
        <QueryStatus loading={visits.loading} error={visits.error} retry={visits.reload} />
        {visits.data && (visits.data.visits.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>HỘI VIÊN</th><th>LỚP</th><th>VÀO</th><th>RA</th></tr></thead>
              <tbody>
                {visits.data.visits.map(visit => (
                  <tr key={visit._id}>
                    <td><b>{visit.memberId?.fullName || 'Hội viên đã xóa'}</b></td>
                    <td>{(visit.classRegistrationIds || []).map(item => item?.classId?.name).filter(Boolean).join(', ') || '—'}</td>
                    <td>{clockTime(visit.checkedInAt)}<small>{staffName(visit.checkedInBy)}</small></td>
                    <td>{visit.checkedOutAt ? <>{clockTime(visit.checkedOutAt)}<small>{staffName(visit.checkedOutBy)}</small></> : <span className="badge green"><i />Đang ở trung tâm</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="Chưa có lượt nào hôm nay" detail="Lượt xuất hiện sau khi lễ tân xác nhận vào." icon="history" />)}
      </section>
    </>
  );
}
