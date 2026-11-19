import { entityId } from '../../api/operations';
import Empty from './Empty';
import PageHeading from './PageHeading';
import QueryStatus from './QueryStatus';
import Screen from './Screen';

/** Design list page: heading + controls + cards. */
export default function ListPage({ title, description, items, loading, error, reload, controls, actions, renderItem, empty = 'Chưa có dữ liệu.' }) {
  return (
    <Screen wide>
      <PageHeading title={title} description={description} actions={actions} />
      {controls}
      <QueryStatus loading={loading} error={error} retry={reload} />
      {!loading && !error && !items.length && (
        <section className="card flush"><Empty text={empty} detail="Bấm làm mới hoặc quay lại sau để xem thông tin mới nhất." /></section>
      )}
      <div className="card-grid">
        {items.map(item => <div key={entityId(item)}>{renderItem(item)}</div>)}
      </div>
    </Screen>
  );
}
