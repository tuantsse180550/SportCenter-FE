import { Icon } from './Icon';

export default function Empty({ text = 'Chưa có dữ liệu', detail = 'Dữ liệu sẽ xuất hiện tại đây sau khi bạn thực hiện thao tác.', icon = 'layers', children }) {
  return (
    <div className="empty">
      <span><Icon name={icon} size={28} /></span>
      <h3>{text}</h3>
      <p>{detail}</p>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
