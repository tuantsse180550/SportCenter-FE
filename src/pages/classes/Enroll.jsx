import { useCallback, useRef, useState } from 'react';
import SubjectFilter from '../../components/common/SubjectFilter';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { ApiError } from '../../api/client';
import { classesApi, coursesApi, coursePrice, schedulesApi, classRegistrationsApi, entityId, referenceId, referenceLabel } from '../../api/operations';
import { membersApi } from '../../api/members';
import { currency } from '../../api/payments';
import { ScheduleChangedError, saveEnrollment } from '../../services/enrollment';
import { enrollmentSteps, enrollmentRoles, enrollmentFor, enrollmentConflicts, upcomingClassSchedules, scheduleSignature } from '../../utils/enrollment';
import { withQuery, workspacePath } from '../../utils/url';
import AccessScreen from '../../components/common/AccessScreen';
import Button from '../../components/common/Button';
import Check from '../../components/common/Check';
import FlowSteps from '../../components/common/FlowSteps';
import QueryStatus from '../../components/common/QueryStatus';
import RelationField from '../../components/common/RelationField';
import Screen from '../../components/common/Screen';
import MemberForm from '../../components/members/MemberForm';

/**
 * 5-step class registration: class → schedule → member info → review → payment.
 * Members register themselves; receptionist/manager pick a member profile.
 */
function EnrollmentFlow({ initialClassId, initialMember }) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const member = user.role === 'MEMBER';
  const [classId, setClassId] = useState(initialClassId || '');
  const [step, setStep] = useState(initialClassId ? 1 : 0);
  const [agreed, setAgreed] = useState(false);
  const [confirmedSchedule, setConfirmedSchedule] = useState('');
  const [savedProfile, setSavedProfile] = useState(null);
  const [selectedMember, setSelectedMember] = useState(initialMember);
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState('');
  const [sport, setSport] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const load = useCallback(async () => {
    const [classes, courses, schedules, registrations, profile] = await Promise.all([
      classesApi.list(token), coursesApi.list(token), schedulesApi.list(token), classRegistrationsApi.list(token),
      member ? membersApi.me(token).catch(e => { if (e instanceof ApiError && e.status === 404) return null; throw e; }) : Promise.resolve(null),
    ]);
    return { classes, courses, schedules, registrations, profile };
  }, [token, member]);
  const query = useApiQuery(load, enrollmentRoles.includes(user.role));

  if (!enrollmentRoles.includes(user.role)) return <AccessScreen denied />;
  const data = query.data;
  const selected = data?.classes.find(item => entityId(item) === classId);
  const course = data?.courses.find(item => entityId(item) === referenceId(selected?.courseId));
  const sessions = upcomingClassSchedules(data?.schedules || [], classId);
  const profile = member ? savedProfile || data?.profile : selectedMember;
  const memberId = profile ? entityId(profile) : '';
  const existing = data && memberId ? enrollmentFor(data.registrations, classId, memberId) : undefined;
  const conflicts = data && memberId ? enrollmentConflicts(data.schedules, data.registrations, classId, memberId) : [];
  const price = coursePrice(course);
  const canPay = course?.status === 'ACTIVE' && price !== undefined && price > 0;
  const ready = !!selected && canPay && sessions.length > 0;
  const chooseClass = value => { setClassId(value); setAgreed(false); setConfirmedSchedule(''); setError(''); setStep(1); };

  async function submit() {
    if (pending.current || !profile || !confirmedSchedule) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const registration = await saveEnrollment(token, { classId, memberId, confirmedSchedule });
      if (!entityId(registration)) throw new Error('Chưa nhận được mã đăng ký. Mở danh sách đăng ký để kiểm tra trước khi thử lại.');
      navigate(withQuery('/payment-edit', { registrationId: entityId(registration) }), { replace: true });
    } catch (e) {
      setError(e.message);
      if (e instanceof ScheduleChangedError) { setStep(1); setAgreed(false); setConfirmedSchedule(''); query.reload(); }
    } finally {
      pending.current = false; setBusy(false);
    }
  }

  return (
    <Screen>
      <Link className="link" to={workspacePath('classes')}>← Danh sách lớp</Link>
      <p className="eyebrow">{member ? 'ĐĂNG KÝ LỚP CỦA BẠN' : 'ĐĂNG KÝ LỚP CHO HỘI VIÊN'}</p>
      <h1 className="title">{enrollmentSteps[step]}</h1>
      <FlowSteps labels={enrollmentSteps} current={step} />
      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />

      {data && step === 0 && (
        <>
          <p className="body">Chọn lớp phù hợp rồi kiểm tra toàn bộ lịch học trước khi đăng ký.</p>
          <SubjectFilter
            options={sportOptions(data.classes)}
            value={sport}
            onChange={setSport}
            total={data.classes.length}
          />
          <div className="card-grid">
            {data.classes.filter(item => !sport || (referenceId(item.subjectId) || '-') === sport).map(item => (
              <article key={entityId(item)} className="card">
                <h2 className="heading">{String(item.name || '')}</h2>
                <p className="body">{referenceLabel(item.subjectId)} · Coach {referenceLabel(item.coachId)}</p>
                <p className="body small">Khóa học: {referenceLabel(item.courseId)}</p>
                <Button small title="Chọn lớp và xem lịch →" onPress={() => chooseClass(entityId(item))} />
              </article>
            ))}
          </div>
          {!data.classes.length && <p className="body">Trung tâm chưa có lớp học.</p>}
        </>
      )}
      {data && step > 0 && !selected && (
        <>
          <p className="error">Lớp không còn tồn tại.</p>
          <Button secondary title="Chọn lớp khác" onPress={() => setStep(0)} />
        </>
      )}

      {data && selected && step > 0 && (
        <>
          <section className="card">
            <h2 className="heading">{String(selected.name)}</h2>
            <p className="body">Coach: {referenceLabel(selected.coachId)}</p>
            <p className="body">Khóa học: {referenceLabel(selected.courseId)}</p>
            <p className="title-md accent">{currency(price)} <span className="body small">/ suất</span></p>
          </section>

          {step === 1 && (
            <>
              <p className="body">Bạn đăng ký toàn bộ lớp theo lịch dưới đây. Chọn lớp khác nếu thời gian chưa phù hợp.</p>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Ngày</th><th>Giờ</th><th>Bài học</th><th>Phòng</th></tr></thead>
                  <tbody>
                    {sessions.map(item => (
                      <tr key={entityId(item)}>
                        <td>{String(item.date).slice(0, 10)}</td>
                        <td>{String(item.startTime)}–{String(item.endTime)}</td>
                        <td>{referenceLabel(item.lessonId)}</td>
                        <td>{referenceLabel(item.roomId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sessions.length && <p className="error">Lớp chưa có buổi học sắp tới. Vui lòng chọn lớp khác hoặc liên hệ trung tâm.</p>}
              {!canPay && <p className="error">Khóa học chưa mở hoặc chưa có học phí để thanh toán.</p>}
              <Check checked={agreed} onPress={() => setAgreed(value => !value)} label="Tôi đã xem và có thể tham gia lịch của lớp." />
              <div className="row-actions">
                <Button disabled={!ready || !agreed} title="Tiếp tục: thông tin hội viên →" onPress={() => { setConfirmedSchedule(scheduleSignature(sessions)); setStep(2); }} />
                <Button secondary title="Chọn lớp khác" onPress={() => setStep(0)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {member ? (
                <>
                  <p className="body">Thông tin hồ sơ được lưu vào tài khoản của bạn, không cần nhập lại ở bước thanh toán.</p>
                  {!profile || editingProfile ? (
                    <MemberForm
                      initial={savedProfile || data.profile || undefined}
                      onSave={async input => { const value = profile ? await membersApi.updateMe(token, input) : await membersApi.createMe(token, input); setSavedProfile(value); }}
                      onSaved={() => setEditingProfile(false)}
                    />
                  ) : (
                    <section className="card">
                      <h2 className="heading">{String(profile.fullName)}</h2>
                      <p className="body">{String(profile.phone || '')}</p>
                      <p className="body">Mục tiêu: {String(profile.goal || 'Chưa cập nhật')}</p>
                      <div><Button secondary small title="Chỉnh sửa thông tin" onPress={() => setEditingProfile(true)} /></div>
                    </section>
                  )}
                </>
              ) : (
                <>
                  <p className="body">Chọn hồ sơ của hội viên được hỗ trợ.</p>
                  <RelationField label="Hội viên tham gia lớp" path="/api/members" token={token} value={memberId} initialLabel={profile ? String(profile.fullName || '') : undefined} onChange={() => {}} disabled={busy} onSelect={setSelectedMember} />
                  {profile && <p className="body">{String(profile.fullName)} · {String(profile.phone || '')}</p>}
                  <Link className="link" to="/members/front-desk">Hội viên mới? Đăng ký tại quầy →</Link>
                </>
              )}
              {!!conflicts.length && <p className="error">Lịch này trùng với lớp đã xác nhận của hội viên. Quay lại để chọn lớp khác.</p>}
              {existing ? (
                <section className="card">
                  <p className="body">Hội viên đã có đăng ký lớp này. Tiếp tục từ đăng ký hiện có.</p>
                  <div><Button title="Mở đăng ký hiện có →" onPress={() => navigate(withQuery('/registration-detail', { id: entityId(existing) }), { replace: true })} /></div>
                </section>
              ) : (
                <div className="row-actions">
                  <Button disabled={!memberId || editingProfile || !!conflicts.length} title="Tiếp tục: kiểm tra đăng ký →" onPress={() => setStep(3)} />
                  <Button secondary title="← Xem lại lịch lớp" onPress={() => setStep(1)} />
                </div>
              )}
            </>
          )}

          {step === 3 && profile && (
            <>
              <section className="card">
                <h2 className="heading">Kiểm tra trước khi lưu</h2>
                <p className="body">Hội viên: {String(profile.fullName)} · {String(profile.phone || '')}</p>
                <p className="body">{sessions.length} buổi sắp tới theo lịch của lớp.</p>
                <p className="body">Học phí khóa học: {currency(price)}. Số tiền thanh toán cuối cùng được lấy từ hệ thống.</p>
                <p className="body">Lưu đăng ký tạo trạng thái chờ thanh toán. Chỉ sau khi thanh toán được xác nhận, lịch mới xuất hiện trong “Lịch của tôi”.</p>
              </section>
              <div className="row-actions">
                <Button disabled={busy || !ready} title={busy ? 'Đang lưu đăng ký…' : 'Lưu đăng ký và đến thanh toán →'} onPress={submit} />
                <Button secondary disabled={busy} title="← Sửa thông tin" onPress={() => setStep(2)} />
              </div>
            </>
          )}
        </>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </Screen>
  );
}

/** Sport chips for the class cards: classes carry a populated subjectId. */
const sportOptions = classes => {
  const counts = new Map();
  for (const item of classes) {
    const id = referenceId(item.subjectId);
    const entry = counts.get(id) || { id, name: id ? referenceLabel(item.subjectId) : 'Chưa rõ môn', count: 0 };
    entry.count += 1;
    counts.set(id, entry);
  }
  return [...counts.values()].sort((a, b) => (a.id === '') - (b.id === '') || b.count - a.count || a.name.localeCompare(b.name, 'vi'));
};

export default function Enroll() {
  const [params] = useSearchParams();
  const classId = params.get('classId') || '';
  const { key, state } = useLocation();
  return <EnrollmentFlow key={key} initialClassId={classId} initialMember={state?.member ?? null} />;
}
