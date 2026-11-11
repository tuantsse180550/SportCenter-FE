import { Card, PageHeader } from "../../components/common/UI.jsx";
export function ManagerRolesPage() {
  return <><PageHeader title="Vai trò và quyền truy cập" subtitle="Quyền được máy chủ kiểm tra theo vai trò và dữ liệu được phân công." /><Card><div style={{ overflowX: "auto" }}><table><thead><tr><th>Vai trò</th><th>Phạm vi</th></tr></thead><tbody>
    <tr><td>Quản lý</td><td>Tài khoản, bộ môn, khóa học, lớp, phòng, lịch học, báo cáo, nhật ký và hỗ trợ.</td></tr>
    <tr><td>Huấn luyện viên</td><td>Lịch dạy, học viên đã xác nhận trong lớp được phân công, kế hoạch, kết quả, đánh giá, bài tập và điểm danh.</td></tr>
    <tr><td>Thành viên</td><td>Hồ sơ, đăng ký, học phí VNPay, biên nhận, lịch học, kết quả, thông báo và hỗ trợ của chính mình.</td></tr>
    <tr><td>Lễ tân</td><td>Tạo tài khoản thành viên, hỗ trợ đăng ký lớp, thu tiền tại quầy, biên nhận, điểm danh và hỗ trợ.</td></tr>
  </tbody></table></div><p>Hệ thống sử dụng bốn vai trò cố định. Quản lý có thể kích hoạt hoặc tạm khóa tài khoản trong mục Tài khoản và nhân viên; thay đổi quyền riêng lẻ và đổi vai trò chưa được hỗ trợ.</p></Card></>;
}
