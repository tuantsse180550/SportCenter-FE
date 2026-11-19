import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canReadResource, workflowDescriptions } from '../../utils/role-workflows';
import { resources } from '../../utils/resources';
import { canManagePayments } from '../../api/payments';
import { canResolveSupport } from '../../api/support';
import { workspacePath } from '../../utils/url';
import Button from '../../components/common/Button';
import Screen from '../../components/common/Screen';

const groups = [
  { title: 'Lịch & lớp học', subtitle: 'Sắp xếp thời gian và tham gia lớp phù hợp.', symbol: '◷', keys: ['schedules', 'classes', 'class-registrations', 'attendances'] },
  { title: 'Hành trình tập luyện', subtitle: 'Theo dõi kế hoạch và từng bước tiến bộ.', symbol: '↗', keys: ['workout-plans', 'workout-results', 'lesson-progress'] },
  { title: 'Khám phá trung tâm', subtitle: 'Huấn luyện viên, bộ môn và nội dung khóa học.', symbol: '⌁', keys: ['coaches', 'subjects', 'courses', 'learning-paths', 'lessons', 'rooms'] },
];

/** All tools available to the signed-in role. */
export default function Operations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user.role;
  const flow = workflowDescriptions[role];
  const primary = role === 'MEMBER' || role === 'RECEPTIONIST' ? '/enroll' : workspacePath(role === 'COACH' ? 'schedules' : 'courses');

  return (
    <Screen wide>
      <header className="page-header">
        <p className="eyebrow">ACTIVEHUB · KHÔNG GIAN CỦA BẠN</p>
        <h1 className="title">{role === 'MEMBER' ? 'Hôm nay bạn muốn làm gì?' : 'Điều hành trung tâm'}</h1>
        <p className="body">Lịch học, kết quả và dịch vụ được kết nối trong cùng một nơi.</p>
      </header>
      {flow && (
        <section className="card hero-card">
          <h2 className="heading">{flow.title}</h2>
          <ol className="steps-list">{flow.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <div><Button title={role === 'MEMBER' ? 'Bắt đầu đăng ký lớp →' : role === 'COACH' ? 'Mở lịch dạy →' : role === 'CENTER_MANAGER' ? 'Chuẩn bị khóa học →' : 'Đăng ký lớp cho hội viên →'} onPress={() => navigate(primary)} /></div>
        </section>
      )}
      <div className="card-grid">
        {groups.filter(group => group.keys.some(key => canReadResource(key, role))).map(group => (
          <section key={group.title} className="card">
            <p className="eyebrow">{group.symbol} ACTIVEHUB</p>
            <h2 className="heading">{group.title}</h2>
            <p className="body">{group.subtitle}</p>
            <div className="chip-row">
              {group.keys.filter(key => canReadResource(key, role)).map(key => (
                <Button key={key} small secondary title={key === 'schedules' && role === 'MEMBER' ? 'Lịch tập của tôi' : resources[key].title} onPress={() => navigate(workspacePath(key))} />
              ))}
            </div>
          </section>
        ))}
        <section className="card">
          <h2 className="heading">Dịch vụ & kết nối</h2>
          <p className="body">Cập nhật thông báo, học phí và liên hệ trung tâm.</p>
          <div className="chip-row">
            <Button small secondary title="Khóa học & học phí" onPress={() => navigate('/pricing')} />
            {['COACH', 'MEMBER'].includes(role) && <Button small secondary title="Bài tập về nhà" onPress={() => navigate('/homeworks')} />}
            <Button small secondary title="Thông báo" onPress={() => navigate('/notifications')} />
            {canManagePayments(role) && <Button small secondary title="Thanh toán" onPress={() => navigate('/payments')} />}
            {(role === 'MEMBER' || canResolveSupport(role)) && <Button small secondary title="Hỗ trợ" onPress={() => navigate('/support')} />}
            {role === 'CENTER_MANAGER' && <Button small secondary title="Lịch sử thao tác" onPress={() => navigate(workspacePath('activity-logs'))} />}
            {role === 'CENTER_MANAGER' && <Button small secondary title="Tài khoản nhân viên" onPress={() => navigate('/staff-accounts')} />}
          </div>
        </section>
      </div>
    </Screen>
  );
}
