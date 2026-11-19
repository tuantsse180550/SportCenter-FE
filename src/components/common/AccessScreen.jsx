import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleHome } from '../../utils/staff-navigation';
import Empty from './Empty';

/** Signed out (denied=false) or missing permission (denied=true). */
export default function AccessScreen({ denied = false }) {
  const { user, sessionMessage } = useAuth();
  return (
    <section className="card flush">
      <Empty
        icon="lock"
        text={denied ? 'Bạn chưa có quyền truy cập' : 'Đăng nhập để tiếp tục'}
        detail={denied ? 'Tài khoản hiện tại không được phép mở chức năng này. Liên hệ quản lý nếu bạn cần quyền.' : sessionMessage || 'Vui lòng đăng nhập bằng tài khoản ActiveHub.'}
      >
        <Link className="btn secondary" to={denied ? roleHome(user?.role) : '/login'}>{denied ? 'Về trang chủ của tôi' : 'Đăng nhập'}</Link>
      </Empty>
    </section>
  );
}
