import { useNavigate } from "react-router-dom";
import { Badge, Button, Card } from "../../components/common/UI.jsx";
import { roleLabels } from "../../services/index.js";

const sports = [
  ["Yoga", "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080"],
  ["Thể hình", "https://images.unsplash.com/photo-1576678927484-cc907957088c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080"],
  ["Quyền anh", "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080"],
  ["Bơi lội", "https://images.unsplash.com/photo-1530549387789-4c1017266635?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080"],
];

function DashboardPreview() {
  return <div className="dashboard-preview"><div className="preview-top"><span /><span /><span /><em>Sport Center | Giao diện minh họa</em></div><div className="preview-body"><aside><b>Sport Center</b>{["Tổng quan", "Lớp học", "Thành viên", "Báo cáo"].map((item, index) => <span className={index === 0 ? "active" : ""} key={item}>{item}</span>)}</aside><main><div className="preview-title"><span>Tổng quan hoạt động</span><b>SC</b></div><div className="preview-stats"><div><strong>--</strong><small>Thành viên</small></div><div><strong>--</strong><small>Doanh thu</small></div><div><strong>--</strong><small>Lớp học</small></div></div><div className="bar-chart">{[35, 48, 42, 70, 58, 84, 76].map((height) => <i key={height} style={{ height: height + "%" }} />)}</div></main></div></div>;
}

export function LandingPage() {
  const navigate = useNavigate();
  return <><section className="hero-section"><div><Badge>QUẢN LÝ TRUNG TÂM THỂ THAO</Badge><h1>Quản lý lớp học, đăng ký và tập luyện trên một giao diện thống nhất.</h1><p>Quản lý lớp học, huấn luyện và đăng ký thành viên cùng Sport Center.</p><div className="hero-actions"><Button onClick={() => navigate("/register")}>Đăng ký</Button><Button variant="secondary" icon="activity" onClick={() => navigate("/login")}>Đăng nhập</Button></div></div><DashboardPreview /></section><section className="public-section"><div className="section-heading"><h2>Một hệ thống cho mọi bộ môn</h2><p>Kết nối lớp học, huấn luyện viên, lịch học và đăng ký thành viên.</p></div><div className="sport-grid">{sports.map(([name, image]) => <article key={name}><img src={image} alt={name + " — luyện tập"} /><div><strong>{name}</strong><span>Lịch học · Huấn luyện viên · Thành viên</span></div></article>)}</div></section><section className="role-section"><div><h2>Thiết kế phù hợp với từng vai trò</h2><p>Quản lý theo dõi hoạt động, huấn luyện viên phụ trách buổi học, thành viên đăng ký và theo dõi tiến độ, lễ tân xử lý đăng ký và thanh toán.</p></div><div className="role-cards">{Object.entries(roleLabels).map(([role, label]) => <Card key={role}><Badge tone="slate">{label}</Badge><strong>{roleLabels[role]}</strong></Card>)}</div></section></>;
}
