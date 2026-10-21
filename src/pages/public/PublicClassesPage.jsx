import { useNavigate } from "react-router-dom";
import { Button, Card, PageHeader } from "../../components/common/UI.jsx";
export function PublicClassesPage() { const navigate = useNavigate(); return <section className="public-section"><PageHeader title="Lớp học" subtitle="Đăng nhập để khám phá các lớp học của trung tâm." /><Card><p>Bạn cần đăng nhập để xem danh sách lớp học.</p><Button onClick={() => navigate("/login")}>Đăng nhập</Button></Card></section>; }
