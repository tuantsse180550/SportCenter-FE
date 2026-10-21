import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "./UI.jsx";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return <header className="public-header"><button className="brand" onClick={() => go("/")}><span><Icon name="activity" /></span><strong>Sport Center</strong><small>Trung tâm thể thao</small></button><nav className={open ? "open" : ""}><button onClick={() => go("/classes")}>Lớp học</button><button onClick={() => go("/pricing")}>Bảng giá</button><button onClick={() => go("/login")}>Đăng nhập</button><Button onClick={() => go("/register")}>Bắt đầu ngay</Button></nav><button className="menu-btn" aria-label={open ? "Đóng trình đơn" : "Mở trình đơn"} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "grid"} /></button></header>;
}
