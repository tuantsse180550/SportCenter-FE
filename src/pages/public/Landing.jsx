import { useCallback, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { classesApi, entityId, referenceLabel } from '../../api/operations';
import { useApiQuery } from '../../hooks/useApiQuery';
import { sportsReference, trainingPhoto } from '../../constants/home';
import { roleHome } from '../../utils/staff-navigation';
import { withQuery } from '../../utils/url';
import { Brand } from '../../layouts/AuthLayout';
import Button from '../../components/common/Button';
import QueryStatus from '../../components/common/QueryStatus';

const features = [
  ['◷', 'Lịch tập trong tầm tay', 'Xem lịch và theo dõi những buổi tập sắp tới.'],
  ['↗', 'Nhìn thấy từng bước tiến bộ', 'Kết quả, kế hoạch và bài học được kết nối trong cùng một nơi.'],
  ['⌁', 'Coach đồng hành cùng bạn', 'Tập luyện theo lộ trình phù hợp với mục tiêu của bạn.'],
];

/** Public home. Signed-in staff see real classes; members go to /member. */
export default function Landing() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const classesRef = useRef(null);
  const [category, setCategory] = useState('Tất cả');
  const load = useCallback(() => classesApi.list(token), [token]);
  const query = useApiQuery(load, !!token);

  if (user?.role === 'MEMBER') return <Navigate to="/member" replace />;

  const cards = token
    ? (query.data || []).map(item => {
      const name = String(item.name || 'Lớp học');
      const subject = referenceLabel(item.subjectId);
      const visual = sportsReference.find(sport => `${name} ${subject}`.toLowerCase().includes(sport.category.toLowerCase())) || sportsReference[5];
      return { ...visual, id: entityId(item), name, category: subject, coach: referenceLabel(item.coachId) };
    })
    : sportsReference.map(item => ({ ...item, id: '' }));
  const categories = ['Tất cả', ...new Set(cards.map(card => card.category))];
  const filtered = cards.filter(card => category === 'Tất cả' || card.category === category);
  const start = () => navigate(user ? roleHome(user.role) : '/register');

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-inner row-between">
          <Brand />
          <nav className="row-actions">
            {user ? <Button small title="Không gian của tôi →" onPress={() => navigate(roleHome(user.role))} /> : (
              <>
                <Link className="link" to="/login">Đăng nhập</Link>
                <Button small title="Đăng ký" onPress={() => navigate('/register')} />
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-inner hero-grid">
          <div className="stack">
            <span className="hero-pill">● KHÔNG GIAN CHO MỌI NHỊP VẬN ĐỘNG</span>
            <h1 className="display">Một nơi để bạn <span className="accent">muốn tập mỗi ngày.</span></h1>
            <p className="body lead">Tìm lớp phù hợp, theo dõi lịch tập và nhìn thấy từng bước tiến bộ. ActiveHub giúp việc vận động trở thành phần dễ chịu nhất trong ngày của bạn.</p>
            <div className="row-actions">
              <Button title="Xem lớp đang mở →" onPress={() => classesRef.current?.scrollIntoView({ behavior: 'smooth' })} />
              <Button secondary title={user ? 'Mở không gian của tôi' : 'Bắt đầu hành trình'} onPress={start} />
            </div>
            <p className="body small">✓ Lịch tập trong tầm tay · ✓ Coach đồng hành · ✓ Theo dõi tiến độ</p>
          </div>
          <figure className="hero-photo" style={{ backgroundImage: `url(${trainingPhoto})` }}>
            <figcaption className="hero-caption">
              <span className="eyebrow">MOVE BETTER, LIVE BETTER</span>
              <strong>Tìm nhịp tập của riêng bạn</strong>
              <small>Ảnh: bruce mars · Unsplash</small>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="landing-steps">
        <div className="landing-inner steps-grid">
          {[['01', 'Chọn lớp phù hợp'], ['02', 'Đăng ký tham gia'], ['03', 'Tập luyện & tiến bộ']].map(([number, label]) => (
            <div key={number}><strong className="accent">{number}</strong><span className="body small">{label}</span></div>
          ))}
        </div>
      </section>

      <section ref={classesRef} className="landing-inner landing-section">
        <p className="eyebrow">TÌM NHỊP VẬN ĐỘNG CỦA BẠN</p>
        <h2 className="title">Hôm nay bạn muốn tập gì?</h2>
        <p className="body">{token ? 'Danh sách lớp được tải trực tiếp từ trung tâm.' : 'Khám phá các bộ môn của trung tâm. Đăng nhập để xem lớp thực tế.'}</p>
        <div className="chip-row" role="tablist" aria-label="Bộ môn">
          {categories.map(item => <Button key={item} small secondary={category !== item} role="tab" aria-selected={category === item} title={item} onPress={() => setCategory(item)} />)}
        </div>
        {token && <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />}
        <div className="card-grid">
          {filtered.map(card => (
            <article key={card.id || card.name} className="class-card" style={{ borderBottomColor: card.color }}>
              <img src={card.image} alt={`Bộ môn ${card.category}`} loading="lazy" />
              <div className="stack-sm class-card-body">
                <h3 className="heading">{card.name}</h3>
                <p className="body small">Coach {card.coach} · {card.category}</p>
                <Button
                  small
                  title={card.id ? (user?.role === 'COACH' ? 'Xem lớp →' : 'Đăng ký lớp →') : 'Đăng nhập để đăng ký'}
                  onPress={() => navigate(!card.id ? '/login' : user?.role === 'COACH' ? '/workspace/classes' : withQuery('/enroll', { classId: card.id }))}
                />
                <small className="credit">Ảnh: {card.credit} · Unsplash</small>
              </div>
            </article>
          ))}
        </div>
        {token && !query.loading && !query.error && !filtered.length && <p className="body">Chưa có lớp phù hợp.</p>}
      </section>

      <section className="landing-features">
        <div className="landing-inner stack">
          <p className="eyebrow">TẤT CẢ TRONG MỘT NƠI</p>
          <h2 className="title">Tập luyện đơn giản hơn. Tiến bộ rõ ràng hơn.</h2>
          <div className="card-grid">
            {features.map(([symbol, title, description]) => (
              <div key={title} className="feature">
                <span className="feature-icon" aria-hidden="true">{symbol}</span>
                <div><strong>{title}</strong><p className="body">{description}</p></div>
              </div>
            ))}
          </div>
          <div><Button title={user ? 'Vào không gian của tôi →' : 'Tạo tài khoản miễn phí →'} onPress={start} /></div>
        </div>
      </section>

      <footer className="landing-inner landing-footer">
        <Brand />
        <p className="body small">ActiveHub · Được thiết kế cho cộng đồng yêu vận động.</p>
      </footer>
    </div>
  );
}
