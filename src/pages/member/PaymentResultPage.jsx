import { Link, useLocation } from "react-router-dom";
import { Button, Card } from "../../components/common/UI.jsx";
import { useApp } from "../../store/useApp.js";
import { usePaymentResult } from "../../store/usePaymentResult.js";
import { paymentIdFromSearch, paymentResultError } from "../../services/api/paymentStatus.js";
import "./payment-result.css";

export function PaymentResultView({ query }) {
  const { data, error, loading, reload, polling, receiptLoading, receiptError } = query;
  if (loading) return <Card><p role="status">Đang kiểm tra trạng thái thanh toán...</p></Card>;
  if (error) return <Card>
    {error.status === 409 && <h2>Chưa thể xác nhận kết quả thanh toán</h2>}
    <p className="form-error" role="alert">{paymentResultError(error)}</p>
    <Button onClick={reload}>Thử tải lại</Button>
  </Card>;
  if (!data) return null;
  if (!["PENDING", "SUCCESS", "FAILED"].includes(data.status)) return <Card><p role="alert">Chưa thể xác nhận trạng thái thanh toán.</p><Button onClick={reload}>Kiểm tra lại</Button></Card>;
  if (data.status === "PENDING" || data.status === "FAILED") return <Card className="payment-result-card">
    <div role="status" aria-live="polite">
      <h2>{data.status === "PENDING" ? "Đang chờ xác nhận thanh toán" : "Thanh toán thất bại"}</h2>
      <p>{data.status === "PENDING" ? "Hệ thống chưa xác nhận thanh toán thành công. Vui lòng kiểm tra lại trước khi thanh toán thêm." : "Hệ thống ghi nhận giao dịch này thất bại. Vui lòng kiểm tra đăng ký lớp trước khi thanh toán lại."}</p>
      {data.registrationStatus === "CANCELLED" && <p>Đăng ký lớp đã bị hủy.</p>}
      {data.registrationStatus === "CONFIRMED" && <p>Đăng ký lớp hiện đã được xác nhận. Bạn có thể xem tại lớp học của tôi.</p>}
      {polling && <p>Đang tự động kiểm tra cập nhật...</p>}
    </div>
    {!polling && <Button onClick={reload}>Kiểm tra lại</Button>}
  </Card>;
  return <Card className="payment-result-card payment-result-success">
    <div role="status" aria-live="polite">
      <h2>Đã thanh toán</h2>
      <p>Hệ thống đã xác nhận giao dịch thanh toán thành công của bạn.</p>
      {data.registrationStatus === "CONFIRMED" && <p>Đăng ký lớp đã được xác nhận.</p>}
      {data.registrationStatus === "PENDING_PAYMENT" && <p>Đăng ký lớp vẫn đang chờ thanh toán trên hệ thống. Vui lòng kiểm tra lại; nếu trạng thái không thay đổi, hãy liên hệ trung tâm.</p>}
      {data.registrationStatus === "CANCELLED" && <p>Đăng ký lớp đã bị hủy. Vui lòng liên hệ trung tâm để được hỗ trợ khoản thanh toán này.</p>}
    </div>
    {receiptLoading && <p role="status">Đang tải biên nhận thanh toán...</p>}
    {!receiptLoading && !receiptError && !data.receipt && <p role="status">Biên nhận chưa được tải. Vui lòng bấm Kiểm tra lại.</p>}
    {receiptError && <p role="alert">Đã thanh toán thành công nhưng chưa tải được biên nhận. {paymentResultError(receiptError)}</p>}
    {data.receipt && <section className="payment-result-receipt" aria-label="Biên nhận thanh toán từ SportCenter">
      <header><h3>SPORT CENTER</h3><p>BIÊN NHẬN THANH TOÁN</p></header>
      <table aria-label="Thông tin biên nhận thanh toán"><tbody>{data.receipt.rows.map(([label, value]) =>
        <tr key={label}><th scope="row">{label}</th><td className={label === "Tổng tiền" ? "receipt-total" : label === "Trạng thái" ? "receipt-paid" : ""}>{value}</td></tr>
      )}</tbody></table>
      <p className="receipt-thanks">Cảm ơn quý hội viên đã sử dụng dịch vụ!</p>
    </section>}
    {(receiptError || (!receiptLoading && !data.receipt) || data.registrationStatus === "PENDING_PAYMENT") && <Button onClick={reload}>Kiểm tra lại</Button>}
  </Card>;
}

export function PaymentResultPage() {
  const location = useLocation();
  const { user, authLoading, authError, retryAuth } = useApp();
  const { id, error: idError } = paymentIdFromSearch(location.search);
  const enabled = !authLoading && !authError && user?.role === "MEMBER" && !!id;
  const query = usePaymentResult(id, enabled, user?.id, location.search);
  let content;
  if (idError) content = <Card><p role="alert">{idError}</p></Card>;
  else if (authLoading) content = <Card><p role="status">Đang kiểm tra phiên đăng nhập...</p></Card>;
  else if (authError) content = <Card><p role="alert">Chưa thể xác minh phiên đăng nhập. Vui lòng thử lại.</p><Button onClick={retryAuth}>Thử lại</Button></Card>;
  else if (!user) content = <Card><p role="alert">Vui lòng đăng nhập bằng tài khoản thành viên sở hữu giao dịch để xem kết quả thanh toán.</p><Link className="btn primary" to="/login" state={{ returnTo: location.pathname + location.search }}>Đăng nhập để xem kết quả</Link></Card>;
  else if (user.role !== "MEMBER") content = <Card><p role="alert">Chỉ tài khoản thành viên sở hữu giao dịch mới có quyền xem thanh toán này.</p></Card>;
  else content = <PaymentResultView query={query} />;
  return <main className="payment-result-page">
    <header><p className="payment-result-eyebrow">SPORT CENTER</p><h1>Kết quả thanh toán</h1><p>Tra cứu biên nhận thanh toán từ hệ thống SportCenter.</p></header>
    {content}
    <nav className="payment-result-actions" aria-label="Điều hướng sau thanh toán">
      {user?.role === "MEMBER" && <Link className="btn primary" to="/member/payments">Thanh toán của tôi</Link>}
      <Link className="btn secondary" to="/">Quay về trang chủ</Link>
    </nav>
  </main>;
}
