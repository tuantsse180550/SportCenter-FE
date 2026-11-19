import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useActorProfile } from '../../hooks/useActorProfile';
import { entityId } from '../../api/operations';
import { currency } from '../../api/payments';
import { buildCatalog, DAYPARTS, featuredClass, loadCatalog, sortCatalog, SORTS, timelineLabel } from '../../utils/class-catalog';
import { subjectTone } from '../../utils/subject-filter';
import { matches } from '../../utils/table';
import { withQuery } from '../../utils/url';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import QueryStatus from '../../components/common/QueryStatus';
import SubjectFilter from '../../components/common/SubjectFilter';
import VideoEmbed from '../../components/common/VideoEmbed';
import ClassCover from '../../components/common/ClassCover';

/** Primary action for a class card, depending on the member's own registration. */
function cardAction(entry, navigate) {
  if (entry.enrolled) return { label: 'Xem lịch học', secondary: true, go: () => navigate(withQuery('/registration-detail', { id: entityId(entry.registration) })) };
  if (entry.pending) return { label: 'Thanh toán', go: () => navigate(withQuery('/payment-edit', { registrationId: entityId(entry.registration) })) };
  return { label: 'Đăng ký', go: () => navigate(withQuery('/enroll', { classId: entry.id })) };
}

function ClassCard({ entry, tone, navigate }) {
  const action = cardAction(entry, navigate);
  const open = () => navigate(withQuery('/class-detail', { id: entry.id }));
  return (
    <article className="class-card-x">
      <button type="button" className={`class-cover ${tone}`} onClick={open} aria-label={`Xem lớp ${entry.name}`}>
        <ClassCover imageUrl={entry.imageUrl} subject={entry.subjectName} alt={entry.name} />
        <span className="class-cover-sport">{entry.subjectName}</span>
        {entry.enrolled ? <span className="class-tag green"><Icon name="check" size={12} />Đã đăng ký</span>
          : entry.pending ? <span className="class-tag amber">Chờ thanh toán</span>
            : <span className="class-tag">{timelineLabel(entry)}</span>}
        {entry.previewLesson && <span className="class-tag video"><Icon name="arrow" size={12} />Có video</span>}
      </button>
      <div className="class-card-body">
        <button type="button" className="class-card-title" onClick={open}>{entry.name}</button>
        <p className="class-meta">
          <Icon name="calendar" size={14} />
          {entry.weekdayLabel ? `${entry.weekdayLabel}${entry.timeRange ? ` · ${entry.timeRange}` : ''}` : 'Đang cập nhật lịch'}
        </p>
        <p className="class-meta"><Icon name="layers" size={14} />{entry.sessions.length ? `${entry.sessions.length} buổi` : 'Chưa xếp buổi'}{entry.lessons.length ? ` · ${entry.lessons.length} bài học` : ''}</p>
        <div className="class-coach"><Avatar name={entry.coachName} small /><span>{entry.coachLabel}</span></div>
        <div className="class-card-foot">
          <div>
            <strong>{typeof entry.price === 'number' ? currency(entry.price) : 'Liên hệ'}</strong>
            {entry.perSession ? <small>≈ {currency(entry.perSession)}/buổi</small> : null}
          </div>
          <Button small secondary={action.secondary} onPress={action.go}>{action.label}</Button>
        </div>
      </div>
    </article>
  );
}

/** Member "Khám phá lớp học": a storefront for classes instead of a CRUD table. */
export default function ExploreClasses() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const actor = useActorProfile(true);
  const memberId = actor.data ? entityId(actor.data) : '';
  const load = useCallback(() => loadCatalog(token), [token]);
  const query = useApiQuery(load);
  const [now] = useState(() => Date.now());
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [sport, setSport] = useState('');
  const [daypart, setDaypart] = useState('');
  const [sort, setSort] = useState('soon');
  const [showPreview, setShowPreview] = useState(false);

  const catalog = useMemo(() => (query.data ? buildCatalog(query.data, { memberId, now }) : []), [query.data, memberId, now]);
  const sportOptions = useMemo(() => {
    const counts = new Map();
    for (const entry of catalog) {
      const item = counts.get(entry.subjectId) || { id: entry.subjectId, name: entry.subjectId ? entry.subjectName : 'Chưa rõ môn', count: 0 };
      item.count += 1;
      counts.set(entry.subjectId, item);
    }
    return [...counts.values()].sort((a, b) => (a.id === '') - (b.id === '') || b.count - a.count || a.name.localeCompare(b.name, 'vi'));
  }, [catalog]);
  const toneIds = sportOptions.map(item => item.id);
  const visible = sortCatalog(catalog.filter(entry => (!sport || (entry.subjectId || '-') === sport)
    && (!daypart || (daypart === 'weekend' ? entry.weekend : entry.dayparts.has(daypart)))
    && matches(search, entry.name, entry.subjectName, entry.coachName, entry.courseName, entry.description)), sort);
  const featured = !search && !sport && !daypart ? featuredClass(catalog) : null;
  const subjects = sportOptions.filter(item => item.id).length;

  return (
    <div className="explore">
      <section className="explore-hero">
        <div>
          <span className="eyebrow">KHÁM PHÁ LỚP HỌC</span>
          <h1>Tìm lớp hợp với bạn</h1>
          <p>{query.data ? `${catalog.length} lớp · ${subjects} môn · khai giảng liên tục` : 'Lớp học, lịch tập và huấn luyện viên của trung tâm.'}</p>
        </div>
        <label className="explore-search">
          <Icon name="search" size={18} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Yoga buổi tối, boxing cho người mới…" aria-label="Tìm lớp học" />
        </label>
        <SubjectFilter options={sportOptions} value={sport} onChange={setSport} total={catalog.length} />
        <div className="explore-row">
          <div className="explore-parts" role="group" aria-label="Lọc theo thời gian">
            {DAYPARTS.map(part => (
              <button type="button" key={part.id} className={daypart === part.id ? 'active' : ''} aria-pressed={daypart === part.id} onClick={() => setDaypart(daypart === part.id ? '' : part.id)}>
                <Icon name={part.icon} size={14} />{part.label}
              </button>
            ))}
          </div>
          <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sắp xếp">
            {SORTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </section>

      <QueryStatus loading={query.loading} error={query.error} retry={query.reload} />

      {featured && (
        <section className="explore-featured">
          <div className={`featured-art ${subjectTone(featured.subjectId, toneIds)}`}>
            {showPreview && featured.previewLesson
              ? <VideoEmbed url={featured.previewLesson.videoUrl} title={`Bài mẫu: ${featured.previewLesson.title}`} />
              : (
                <>
                  <ClassCover imageUrl={featured.imageUrl} subject={featured.subjectName} alt={featured.name} fit="contain" />
                  <span className="class-tag">{timelineLabel(featured)}</span>
                  <span className="featured-sport">{featured.subjectName}</span>
                  {featured.previewLesson && (
                    <button type="button" className="featured-play" onClick={() => setShowPreview(true)}>
                      <Icon name="arrow" size={14} />Xem bài mẫu: {featured.previewLesson.title}
                    </button>
                  )}
                </>
              )}
          </div>
          <div className="featured-body">
            <span className="eyebrow">{featured.startsOn ? 'SẮP KHAI GIẢNG' : 'LỚP NỔI BẬT'}</span>
            <h2>{featured.name}</h2>
            <p>{featured.description || `Khóa ${featured.courseName} cùng ${featured.coachLabel}.`}</p>
            <div className="featured-facts">
              {featured.timeRange && <span><Icon name="clock" size={15} />{featured.timeRange}</span>}
              {featured.weekdayLabel && <span><Icon name="calendar" size={15} />{featured.weekdayLabel}</span>}
              <span><Icon name="layers" size={15} />{featured.sessions.length} buổi</span>
              <span><Icon name="user" size={15} />{featured.coachLabel}</span>
            </div>
            <div className="featured-foot">
              <div>
                <strong>{typeof featured.price === 'number' ? currency(featured.price) : 'Liên hệ'}</strong>
                <small> / khóa{featured.perSession ? ` · ≈ ${currency(featured.perSession)}/buổi` : ''}</small>
              </div>
              <div className="row-actions">
                <Button secondary onPress={() => navigate(withQuery('/class-detail', { id: featured.id }))}>Xem chi tiết</Button>
                <Button icon="arrow" onPress={() => navigate(withQuery('/enroll', { classId: featured.id }))}>Đăng ký ngay</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {query.data && (
        <>
          <div className="explore-count">{visible.length} lớp phù hợp</div>
          {visible.length ? (
            <div className="class-grid">
              {visible.map(entry => <ClassCard key={entry.id} entry={entry} tone={subjectTone(entry.subjectId, toneIds)} navigate={navigate} />)}
            </div>
          ) : (
            <section className="card flush">
              <Empty text="Chưa thấy lớp phù hợp" detail="Thử bỏ bớt bộ lọc, hoặc gửi yêu cầu để trung tâm tư vấn lớp cho bạn." icon="search">
                <Button secondary icon="help" onPress={() => navigate(withQuery('/support', { topic: 'tư vấn chọn lớp' }))}>Nhờ trung tâm tư vấn</Button>
              </Empty>
            </section>
          )}
        </>
      )}
    </div>
  );
}
