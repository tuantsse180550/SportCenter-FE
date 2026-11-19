import Button from './Button';
import { Icon } from './Icon';

/** Loading line, or error alert + retry, for a useApiQuery result. */
export default function QueryStatus({ loading, error, retry }) {
  if (loading) return <p className="loading" role="status"><span className="spinner" aria-hidden="true" /> Đang tải…</p>;
  if (error) {
    return (
      <div className="alert-box red" role="alert">
        <Icon name="alert" size={18} />
        <div><p>{error.message}</p></div>
        {retry && <Button secondary small title="Thử lại" onPress={retry} />}
      </div>
    );
  }
  return null;
}
