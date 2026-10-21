import { useNavigate } from "react-router-dom";
import { Icon } from "../common/UI.jsx";

const actions = [
  ["Khám phá lớp học", "/member/classes", "activity"],
  ["Lịch học của tôi", "/member/schedule", "calendar"],
  ["Kết quả tập luyện", "/member/results", "chart"],
  ["Tài khoản", "/member/account", "user"],
];

export function QuickActions() {
  const navigate = useNavigate();
  return <div className="quick-actions">{actions.map(([label, href, icon]) => <button key={href} onClick={() => navigate(href)}><Icon name={icon} /><span>{label}</span></button>)}</div>;
}
