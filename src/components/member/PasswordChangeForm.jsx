import { Card } from "../common/UI.jsx";

export function PasswordChangeForm() {
  return <Card className="mt">
    <h2>Đổi mật khẩu</h2>
    <p className="member-notice" role="status">
      Máy chủ hiện chưa hỗ trợ tự đổi mật khẩu trên ứng dụng web. Nếu bạn sử dụng tài khoản nội bộ và cần đổi mật khẩu, vui lòng liên hệ quản trị viên trung tâm; với tài khoản Google, hãy đổi mật khẩu trực tiếp tại Google.
    </p>
  </Card>;
}
