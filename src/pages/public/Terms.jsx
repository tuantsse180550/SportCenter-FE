import { Link } from 'react-router-dom';
import { Brand } from '../../layouts/AuthLayout';

export default function Terms() {
  return (
    <main className="page-narrow">
      <Brand />
      <h1 className="title">Thông tin sử dụng</h1>
      <h2 className="heading">Thông tin tài khoản</h2>
      <p className="body">Email và mật khẩu được gửi tới backend SportCenter để tạo tài khoản và xác thực. Đăng nhập Google gửi ID token tới backend; tài khoản cần xác minh sẽ nhận OTP qua email.</p>
      <p className="body">Phiên đăng nhập được lưu trong tab trình duyệt hiện tại và kết thúc khi đóng tab hoặc đăng xuất.</p>
      <h2 className="heading">Đăng ký lớp học</h2>
      <p className="body">Gửi đăng ký lớp sẽ tạo bản ghi thật tại backend với trạng thái chờ thanh toán. Số tiền thanh toán do backend tính theo học phí của khóa học.</p>
      <Link to="/register" className="link">← Quay lại đăng ký</Link>
    </main>
  );
}
