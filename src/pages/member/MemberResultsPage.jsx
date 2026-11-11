import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, PageHeader } from "../../components/common/UI.jsx";
import { AsyncPanel } from "../../components/common/AsyncPanel.jsx";
import { ResultCard } from "../../components/member/MemberUI.jsx";
import { trainingResultService } from "../../services/index.js";
import { useApp } from "../../store/useApp.js";
import { useQuery } from "../../store/useQuery.js";
export function MemberResultsPage() {
 const { user } = useApp();
 const navigate = useNavigate();
 const query = useQuery(() => user?.memberId ? trainingResultService.listForMember(user.memberId) : Promise.resolve([]), [user?.memberId]);
 return <><PageHeader title="Kết quả tập luyện" subtitle="Nhìn lại quá trình tập luyện và nhận xét từ huấn luyện viên." />{!user?.memberId ? <Card><EmptyState title="Hoàn thiện hồ sơ để xem kết quả tập luyện" text="Hồ sơ thành viên giúp huấn luyện viên ghi nhận kết quả và nhận xét cho bạn." action={<Button onClick={() => navigate("/member/account")}>Hoàn thiện hồ sơ</Button>} /></Card> : <AsyncPanel query={query}>{results => results.length ? <div className="member-results">{[...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(r => <ResultCard key={r.id} result={r} />)}</div> : <Card><EmptyState title="Chưa có kết quả tập luyện" text="Sau các buổi tập, huấn luyện viên sẽ ghi nhận kết quả và phản hồi tại đây." /></Card>}</AsyncPanel>}</>;
}
