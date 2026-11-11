import { Link } from "react-router-dom";
import { Card, PageHeader } from "../../components/common/UI.jsx";
export function PricingPage() { return <><PageHeader title="Học phí khóa học" subtitle="Học phí tính theo từng học viên đăng ký lớp." /><Card><p>Mỗi khóa học có mức học phí riêng. Khi đăng ký lớp, học phí được chốt cho đăng ký của bạn và hiển thị trước khi thanh toán.</p><p><Link to="/login">Đăng nhập để khám phá lớp học và xem học phí</Link></p></Card></>; }
