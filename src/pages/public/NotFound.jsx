import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page-narrow">
      <h1 className="title">Không tìm thấy trang</h1>
      <p className="body">Đường dẫn không tồn tại hoặc đã bị thay đổi.</p>
      <Link to="/" className="link">← Về trang chủ</Link>
    </main>
  );
}
