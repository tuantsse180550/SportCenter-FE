import { useState } from "react";
import { RegistrationPaymentModal } from "../../components/common/RegistrationPaymentModal.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, EmptyState } from "../../components/common/UI.jsx";
import { AsyncPanel, ErrorMessage } from "../../components/common/AsyncPanel.jsx";
import { MemberRegistrationNotice, SportImage, StatusBadge } from "../../components/member/MemberUI.jsx";
import { classService, paymentService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useMutation, useQuery } from "../../store/useQuery.js";
import { formatters } from "../../utils/formatters.js";

export function MemberClassRegistrationPanel({ classId, memberId, confirmation, registration, coursePrice, pending, onRegister, onProfile, onSchedule, onPay }) {
  const hasCoursePrice = Number.isFinite(coursePrice) && coursePrice >= 0;
  const confirmedSession = memberId && !confirmation.loading && !confirmation.error &&
    confirmation.data?.find(session => session.classId === classId && session.registrationStatus === "CONFIRMED");
  const confirmedStatus = confirmedSession?.registrationStatus || (registration?.status === "CONFIRMED" ? registration.status : null);
  if (confirmedStatus) return <>
    <h2>Thông tin đăng ký</h2>
    <div role="status"><StatusBadge status={confirmedStatus} /><p>Bạn đã được xác nhận tham gia lớp.</p></div>
    <p>Theo dõi lịch học và kết quả tập luyện trong tài khoản của bạn.</p>
    <Button onClick={onSchedule}>Xem lịch học của tôi</Button>
  </>;
  if (registration) return <>
    <h2>Thông tin đăng ký</h2>
    <div role="status"><p>Bạn đã đăng ký lớp này.</p>{registration.status && <StatusBadge status={registration.status} />}</div>
    {registration.status === "PENDING_PAYMENT" && <><p>Thanh toán học phí để xác nhận đăng ký.</p><Button onClick={onPay}>Thanh toán qua VNPay Sandbox</Button></>}
    {registration.status === "CANCELLED" && <><p>Đăng ký đã hủy. Bạn có thể gửi yêu cầu đăng ký lại nếu đủ điều kiện.</p>{!hasCoursePrice && <p>Vui lòng chờ trung tâm cập nhật học phí trước khi đăng ký lại.</p>}<Button disabled={pending || !hasCoursePrice} onClick={onRegister}>Đăng ký lại</Button></>}
  </>;
  if (memberId && confirmation.loading) return <><h2>Thông tin đăng ký</h2><p role="status">Đang kiểm tra đăng ký của bạn...</p></>;
  if (memberId && confirmation.error) return <>
    <h2>Thông tin đăng ký</h2><p>Chưa thể kiểm tra đăng ký của bạn. Vui lòng thử lại trước khi gửi yêu cầu.</p>
    <ErrorMessage error={confirmation.error} /><Button variant="secondary" onClick={confirmation.reload}>Thử kiểm tra lại</Button>
  </>;
  return <>
    <span className="member-eyebrow">Bắt đầu hành trình của bạn</span><h2>Đăng ký lớp học</h2>
    <p className="member-notice">{hasCoursePrice ? "Học phí trọn khóa / học viên: " + formatters.money(coursePrice) : "Chưa có học phí từ hệ thống. Vui lòng liên hệ trung tâm."}</p>
    {!memberId ? <><p>Hoàn thiện hồ sơ cá nhân để đăng ký lớp học.</p><Button onClick={onProfile}>Hoàn thiện hồ sơ</Button></> : <>
      <MemberRegistrationNotice />
      <p>{hasCoursePrice ? "Sau khi đăng ký, bạn có thể thanh toán học phí qua VNPay Sandbox." : "Vui lòng chờ trung tâm cập nhật học phí trước khi đăng ký."}</p>
      <Button disabled={pending || !hasCoursePrice} onClick={onRegister}>{pending ? "Đang gửi..." : "Yêu cầu đăng ký"}</Button>
    </>}
  </>;
}

export function MemberClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, toast } = useApp();
  const mutation = useMutation();
  const [submitted, setSubmitted] = useState(null);
  const [paying, setPaying] = useState(null);
  const query = useQuery(() => classService.getMemberClassDetail(classId), [classId]);
  const sessions = useQuery(() => classService.getMemberClassSessions(classId), [classId]);
  const confirmation = useQuery(() => user.memberId ? paymentService.listMyRegistrations() : Promise.resolve([]), [user.id, user.memberId, classId]);
  const registration = confirmation.data?.find(row => row.classId === classId) || (submitted && submitted.classId === classId && submitted.userId === user.id ? submitted.registration : null);
  const isConfirmed = registration?.status === "CONFIRMED";
  const register = () => {
    if (!user.memberId || query.loading || query.error || !Number.isFinite(query.data?.coursePrice) || query.data.coursePrice < 0 || confirmation.loading || confirmation.error || isConfirmed || (registration && registration.status !== "CANCELLED") || mutation.pending) return;
    if (!window.confirm(`Đăng ký khóa học: ${query.data.course?.name || query.data.name}\nLớp: ${query.data.name}\nHọc phí mỗi học viên: ${formatters.money(query.data.coursePrice)}\nCần thanh toán để xác nhận chỗ học.`)) return;
    mutation.run(async () => {
      try { return await classService.registerMember(classId, user.memberId); }
      catch (error) {
        if (error.status === 409 && error.message === "Member is already registered for this class") {
          const existing = (await paymentService.listMyRegistrations()).find(row => row.classId === classId);
          if (existing) return existing;
        }
        throw error;
      }
    }, saved => {
      setSubmitted({ classId, userId: user.id, registration: saved });
      toast("Trạng thái đăng ký: " + saved.status);
      if (saved.status === "PENDING_PAYMENT") setPaying(saved.id);
    });
  };
  return <>
    <BackButton onClick={() => navigate("/member/classes")}>Quay lại lớp học</BackButton>
    <ErrorMessage error={mutation.error} />
    <AsyncPanel query={query}>{detail => {
      if (!detail) return <Card><EmptyState title="Không tìm thấy lớp học" /></Card>;
      return <div className="member-detail-grid">
        <div>
          <SportImage sport={detail.sport} className="member-detail-photo" />
          <section className="member-section"><span className="member-eyebrow">{detail.sport || "Lớp thể thao"}</span><h1>{detail.name}</h1><p className="member-lead">Huấn luyện viên: {detail.coach?.name || "Chưa có thông tin"}</p>{detail.course?.name && <p>Khóa học: {detail.course.name}</p>}<h2>Giới thiệu lớp học</h2><p>{detail.description || "Lớp chưa có mô tả. Vui lòng liên hệ trung tâm để tìm hiểu thêm."}</p></section>
          <section className="member-section"><h2>Lịch học</h2><AsyncPanel query={sessions}>{rows => rows.length ?
            <div className="member-detail-sessions">{rows.map(s => <Card key={s.id}><strong>{formatters.date(s.date)}</strong><p>{s.startTime} – {s.endTime}</p>{s.lesson?.title && <p>{s.lesson.title}</p>}{s.room && <p>Phòng: {s.room.roomNumber} · {s.room.name}</p>}<StatusBadge status={s.status} /></Card>)}</div> :
            <Card><EmptyState title="Chưa có buổi học được xếp lịch" text="Vui lòng xác nhận thời gian học với trung tâm trước khi thanh toán." /></Card>
          }</AsyncPanel></section>
        </div>
        <aside><Card className="member-booking">
          <MemberClassRegistrationPanel classId={classId} memberId={user.memberId} confirmation={confirmation} registration={registration} coursePrice={detail.coursePrice} pending={mutation.pending} onRegister={register} onProfile={() => navigate("/member/account")} onSchedule={() => navigate("/member/schedule")} onPay={() => setPaying(registration.id)} />
        </Card></aside>
      </div>;
    }}</AsyncPanel>
    {paying && <RegistrationPaymentModal registrationId={paying} customerView onClose={() => { setPaying(null); confirmation.reload(); }} />}
  </>;
}
