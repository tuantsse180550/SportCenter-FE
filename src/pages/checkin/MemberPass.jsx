import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { checkInApi, clockTime, dayTime, secondsLeft } from '../../api/checkin';
import { workspacePath } from '../../utils/url';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';

const POLL_MS = 3000;
const mmss = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const tone = item => (item.status === 'PENDING_PAYMENT' ? 'amber' : item.active ? 'green' : 'muted');

/** Member: registration status, a short-lived single-use QR for the front desk, and past visits. */
export default function MemberPass() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const loadAccess = useCallback(() => checkInApi.me(token), [token]);
  const access = useApiQuery(loadAccess);
  const loadVisits = useCallback(() => checkInApi.myVisits(token), [token]);
  const visits = useApiQuery(loadVisits);
  // reload() empties `data` until the answer arrives; keep the last answer on screen so the 3 s poll
  // does not unmount the page (it would flash "Đang tải…" and jump every few seconds).
  const [lastAccess, setLastAccess] = useState(null);
  const [lastVisits, setLastVisits] = useState(null);
  if (access.data && access.data !== lastAccess) setLastAccess(access.data);
  if (visits.data && visits.data !== lastVisits) setLastVisits(visits.data);
  const data = access.data ?? lastAccess;
  const visitList = visits.data ?? lastVisits;
  const openSince = data?.openVisit?.checkedInAt || '';
  const lastOpen = useRef(undefined);
  const { reload: reloadAccess } = access;
  const { reload: reloadVisits } = visits;

  // While a code is on screen: tick the countdown and watch for the front desk's confirmation.
  useEffect(() => {
    if (!qr) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(reloadAccess, POLL_MS);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [qr, reloadAccess]);

  // The visit opened or closed → the code shown was used: hide it and say what happened.
  useEffect(() => {
    if (!data) return;
    if (lastOpen.current !== undefined && lastOpen.current !== openSince) {
      setQr(null);
      setNotice(openSince ? `Lễ tân đã xác nhận vào lúc ${clockTime(openSince)}.` : 'Lễ tân đã xác nhận ra. Hẹn gặp lại!');
      reloadVisits();
    }
    lastOpen.current = openSince;
  }, [data, openSince, reloadVisits]);

  async function getCode() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setQr(await checkInApi.issueQr(token)); setNow(Date.now()); }
    catch (e) { setError(e.message); access.reload(); }
    finally { setBusy(false); }
  }

  const left = qr ? secondsLeft(qr.expiresAt, now) : 0;
  const action = data?.nextAction === 'OUT' ? 'ra' : 'vào';

  return (
    <>
      <PageHeading title="Mã QR ra/vào" description="Đưa mã cho lễ tân quét khi đến và khi rời trung tâm. Mỗi mã chỉ dùng một lần và hết hạn sau 2 phút." />
      {!data && <QueryStatus loading={access.loading} error={access.error} retry={access.reload} />}
      {data && (
        <div className="pass-grid">
          <section className="card pass-card">
            {data.openVisit
              ? <div className="pass-state inside"><Icon name="checkCircle" size={20} /><div><b>Đang ở trung tâm</b><span>Vào lúc {clockTime(data.openVisit.checkedInAt)} · nhớ đưa mã cho lễ tân khi ra về</span></div></div>
              : <div className="pass-state"><Icon name="room" size={20} /><div><b>Đang ở ngoài trung tâm</b><span>Lấy mã khi đến quầy lễ tân</span></div></div>}
            {notice && <div className="alert-box green" role="status"><Icon name="checkCircle" size={18} /><p>{notice}</p></div>}
            {error && <div className="alert-box red" role="alert"><Icon name="alert" size={18} /><p>{error}</p></div>}

            {!data.allowed && (
              <div className="pass-blocked">
                <Icon name="lock" size={28} />
                <p className="body">{data.message}</p>
                {data.code === 'PENDING_APPROVAL'
                  ? <Button secondary onPress={() => navigate(workspacePath('class-registrations'))}>Xem đăng ký của tôi</Button>
                  : <Button onPress={() => navigate('/explore')}>Khám phá lớp học</Button>}
              </div>
            )}

            {data.allowed && !qr && (
              <div className="pass-blocked">
                <Icon name="qr" size={34} />
                <p className="body">Mã dùng để xác nhận <b>{action}</b> trung tâm.</p>
                <Button icon="qr" disabled={busy} onPress={getCode}>{busy ? 'Đang tạo mã…' : `Lấy mã QR ${action}`}</Button>
              </div>
            )}

            {data.allowed && qr && (
              <div className="pass-qr">
                <div className={`pass-qr-frame${left ? '' : ' expired'}`}>
                  <img src={qr.qrImage} alt={`Mã QR ${action} trung tâm`} width="240" height="240" />
                  {!left && <span>Mã đã hết hạn</span>}
                </div>
                <p className="pass-qr-meta">{left ? <>Mã {action} · còn <b>{mmss(left)}</b></> : 'Lấy mã mới để tiếp tục'}</p>
                <Button secondary={!!left} icon="repeat" disabled={busy} onPress={getCode}>{busy ? 'Đang tạo mã…' : 'Lấy mã mới'}</Button>
                <p className="body small">Mã chỉ chứa một chuỗi ngẫu nhiên, không chứa thông tin cá nhân. Lấy mã mới thì mã cũ hết hiệu lực.</p>
              </div>
            )}
          </section>

          <section className="card flush">
            <div className="card-heading"><h2>Đăng ký của tôi</h2></div>
            {data.registrations.length
              ? data.registrations.map(item => (
                <div key={item.id} className="pass-row">
                  <div><b>{item.className}</b><span>{[item.subjectName, item.courseName].filter(Boolean).join(' · ')}</span></div>
                  <span className={`badge ${tone(item)}`}><i />{item.label}</span>
                </div>
              ))
              : <Empty text="Chưa có đăng ký lớp" detail="Đăng ký một lớp để có mã QR ra/vào." icon="layers" />}
          </section>
        </div>
      )}

      <section className="card flush">
        <div className="card-heading"><h2>Lượt ra/vào gần đây</h2></div>
        {!visitList && <QueryStatus loading={visits.loading} error={visits.error} retry={visits.reload} />}
        {visitList && (visitList.length
          ? visitList.map(visit => (
            <div key={visit._id} className="pass-row">
              <div><b>Vào {dayTime(visit.checkedInAt)}</b><span>{visit.checkedOutAt ? `Ra ${dayTime(visit.checkedOutAt)}` : visit.status === 'OPEN' ? 'Đang ở trung tâm' : 'Không ghi giờ ra'}</span></div>
              <span className="pass-classes">{(visit.classRegistrationIds || []).map(item => item?.classId?.name).filter(Boolean).join(', ')}</span>
            </div>
          ))
          : <Empty text="Chưa có lượt nào" detail="Lượt ra/vào xuất hiện sau khi lễ tân xác nhận." icon="history" />)}
      </section>
    </>
  );
}
