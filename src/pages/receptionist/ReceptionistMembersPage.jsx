import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MemberTable } from "../../components/common/DataViews.jsx";
import { Button, Card, Icon, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { memberService } from "../../services/index.js";
import { useQuery } from "../../store/useQuery.js";
export function ReceptionistMembersPage() { const navigate = useNavigate(); const [search, setSearch] = useState(""); const query = useQuery(() => memberService.listMembers()); return <><PageHeader title="Tìm kiếm thành viên" subtitle="Tìm theo họ tên, số điện thoại hoặc mã thành viên." action={<Button onClick={() => navigate("/receptionist/members/new")}>Hồ sơ thành viên mới</Button>} /><Card className="search-hero"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm thành viên..." /></Card><AsyncPanel query={query}>{(members) => { const needle = search.trim().toLocaleLowerCase("vi"); const visible = members.filter(m => !needle || [m.fullName, m.account?.email, m.phone, m.id].filter(Boolean).join(" ").toLocaleLowerCase("vi").includes(needle)); return <MemberTable members={visible} onOpen={(m) => navigate("/receptionist/members/" + m.id)} />; }}</AsyncPanel></>; }
