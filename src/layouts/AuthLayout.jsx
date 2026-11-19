import { Link } from 'react-router-dom';
import CourtArt from '../components/common/CourtArt';
import { Icon } from '../components/common/Icon';

/** ActiveHub word mark linking to the public landing page. */
export function Brand() {
  return (
    <Link to="/" className="landing-brand" aria-label="ActiveHub, về trang chủ">
      <span className="brand-mark"><Icon name="sport" size={21} /></span>
      <span>Active<span>Hub</span></span>
    </Link>
  );
}

/** Design auth screen: brand art on the left, form card on the right. */
export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-art">
        <Link to="/" className="brand" aria-label="ActiveHub, về trang chủ">
          <span className="brand-mark"><Icon name="sport" size={25} /></span>
          Active<span>Hub</span>
          <sup>WORKSPACE</sup>
        </Link>
        <h1>Kết nối đam mê.<br />Chuyển động mỗi ngày.</h1>
        <p>Một không gian cho mọi hành trình thể thao.</p>
        <CourtArt />
      </div>
      <main className="auth-form card">{children}</main>
    </div>
  );
}
