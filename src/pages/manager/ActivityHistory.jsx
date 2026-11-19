import { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestEnvelope, enc } from '../../api/client';
import {
  classRegistrationsApi, classesApi, coachesApi, coursesApi, learningPathsApi, lessonsApi, schedulesApi, subjectsApi,
} from '../../api/operations';
import { membersApi } from '../../api/members';
import { paymentsApi } from '../../api/payments';
import { roomsApi } from '../../api/rooms';
import { useApiQuery } from '../../hooks/useApiQuery';
import { addDays } from '../../utils/schedule-time';
import { bangkokDate } from '../../utils/url';
import { ACTIVITY_GROUPS, buildTargetIndex, dayHeading, matchesActivity, toActivityRows } from '../../utils/activity-log';
import Button from '../../components/common/Button';
import Empty from '../../components/common/Empty';
import { Icon } from '../../components/common/Icon';
import PageHeading from '../../components/common/PageHeading';
import QueryStatus from '../../components/common/QueryStatus';

const PAGE_SIZE = 200;
const RANGES = [['today', 'Hôm nay'], ['7', '7 ngày'], ['30', '30 ngày'], ['all', 'Tất cả']];
const settle = promise => Promise.resolve(promise).then(items => (Array.isArray(items) ? items : [])).catch(() => []);

/** Start of the chosen range as an ISO instant in UTC+7 ('' = no lower bound). */
function rangeStart(range, today) {
  if (range === 'all') return '';
  const day = range === 'today' ? today : addDays(today, -(Number(range) - 1));
  return `${day}T00:00:00+07:00`;
}

/** Pages 1..pages of the log, newest first. Works with or without server pagination. */
async function loadLogs(token, from, pages) {
  const query = page => `/api/activity-logs?page=${page}&limit=${PAGE_SIZE}${from ? `&from=${enc(from)}` : ''}`;
  const first = await requestEnvelope(query(1), { token });
  const total = first.pagination?.total ?? (first.data || []).length;
  const more = await Promise.all(Array.from({ length: Math.min(pages, Math.ceil(total / PAGE_SIZE)) - 1 }, (_, index) => requestEnvelope(query(index + 2), { token })));
  return { logs: [first, ...more].flatMap(result => result.data || []), total };
}

/** Lists used to turn record ids into names; each one may fail on its own (role without access). */
async function loadIndex(token) {
  const [courses, classes, subjects, rooms, lessons, paths, members, coaches, schedules, registrations, payments] = await Promise.all([
    settle(coursesApi.list(token)), settle(classesApi.list(token)), settle(subjectsApi.list(token)), settle(roomsApi.list(token)),
    settle(lessonsApi.list(token)), settle(learningPathsApi.list(token)), settle(membersApi.list(token)), settle(coachesApi.list(token)),
    settle(schedulesApi.list(token)), settle(classRegistrationsApi.list(token)), settle(paymentsApi.list(token)),
  ]);
  return buildTargetIndex({ courses, classes, subjects, rooms, lessons, paths, members, coaches, schedules, registrations, payments });
}

const timeOf = value => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
const fullTime = value => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' });

/** Manager's activity history: who did what to which record, by day, with filters. Read-only. */
export default function ActivityHistory() {
  const { token } = useAuth();
  // Read the clock once, so the loader below stays stable between renders.
  const [today] = useState(() => bangkokDate());
  const [range, setRange] = useState('7');
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actor, setActor] = useState('');
  const [group, setGroup] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [open, setOpen] = useState('');

  const from = rangeStart(range, today);
  const logsLoader = useCallback(() => loadLogs(token, from, pages), [token, from, pages]);
  const logs = useApiQuery(logsLoader);
  const indexLoader = useCallback(() => loadIndex(token), [token]);
  const index = useApiQuery(indexLoader).data;

  // React Compiler memoizes these; no manual useMemo needed.
  const rows = toActivityRows(logs.data?.logs || [], index || {});
  const actors = [...new Map(rows.map(row => [row.actor.id, row.actor])).values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const shown = rows.filter(row => (!actor || row.actor.id === actor) && (!group || row.group === group) && (!sensitiveOnly || row.sensitive) && matchesActivity(row, search));
  const days = [];
  for (const row of shown) {
    if (days.at(-1)?.day !== row.day) days.push({ day: row.day, rows: [] });
    days.at(-1).rows.push(row);
  }
  const sensitiveCount = rows.filter(row => row.sensitive).length;
  const loaded = logs.data?.logs.length || 0;
  const changeRange = value => { setRange(value); setPages(1); setOpen(''); };

  return (
    <>
      <PageHeading title="Lịch sử thao tác" description="Ai đã làm gì trên hệ thống, với khóa học, lớp, hội viên hay giao dịch nào." />
      <section className="card activity-filters">
        <label className="activity-search">
          <Icon name="search" size={17} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên khóa học, lớp, hội viên, người thực hiện" aria-label="Tìm trong lịch sử" />
        </label>
        <select value={actor} onChange={event => setActor(event.target.value)} aria-label="Người thực hiện">
          <option value="">Mọi người thực hiện</option>
          {actors.map(item => <option key={item.id} value={item.id}>{item.name}{item.roleLabel ? ` · ${item.roleLabel}` : ''}</option>)}
        </select>
        <select value={group} onChange={event => setGroup(event.target.value)} aria-label="Nhóm chức năng">
          <option value="">Mọi chức năng</option>
          {Object.entries(ACTIVITY_GROUPS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
        </select>
        <div className="segmented" role="group" aria-label="Khoảng thời gian">
          {RANGES.map(([value, label]) => <button type="button" key={value} className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => changeRange(value)}>{label}</button>)}
        </div>
        <button type="button" className={`activity-flag${sensitiveOnly ? ' active' : ''}`} aria-pressed={sensitiveOnly} onClick={() => setSensitiveOnly(value => !value)}>
          <Icon name="alert" size={15} /> Cần chú ý{sensitiveCount ? ` (${sensitiveCount})` : ''}
        </button>
      </section>

      <QueryStatus loading={logs.loading} error={logs.error} retry={logs.reload} />

      {logs.data && (
        <section className="card flush activity-timeline">
          {days.map(({ day, rows: dayRows }) => (
            <div key={day || 'unknown'}>
              <h2 className="activity-day">{dayHeading(day, today)}</h2>
              {dayRows.map(row => (
                <article key={row.id} className="activity-row">
                  <span className={`log-icon tone-${row.tone}`}><Icon name={row.icon} size={17} /></span>
                  <button type="button" className="activity-main" aria-expanded={open === row.id} onClick={() => setOpen(current => (current === row.id ? '' : row.id))}>
                    <span className="activity-sentence">
                      {row.sentence}{row.target ? <> · <b>{row.target}</b></> : null}
                      {row.count > 1 && <span className="activity-count">{row.count} lần</span>}
                    </span>
                    <span className="activity-actor">
                      {row.actor.name}{row.actor.roleLabel ? ` · ${row.actor.roleLabel}` : ''}
                      {row.sensitive && <span className="activity-tag">Cần chú ý</span>}
                    </span>
                    {open === row.id && row.technical && (
                      <span className="activity-tech">
                        <span>Thời điểm: {fullTime(row.at)}{row.count > 1 ? ` (lần đầu ${timeOf(row.oldestAt)})` : ''}</span>
                        {row.actor.email && <span>Tài khoản: {row.actor.email}</span>}
                        <span>Chi tiết kỹ thuật: {row.technical.method} {row.technical.path}{row.technical.statusCode ? ` · HTTP ${row.technical.statusCode}` : ''}{row.technical.ip ? ` · IP ${row.technical.ip}` : ''}</span>
                      </span>
                    )}
                  </button>
                  <time className="activity-time" dateTime={row.at}>{row.at ? timeOf(row.at) : ''}</time>
                </article>
              ))}
            </div>
          ))}
          {!shown.length && <Empty text={rows.length ? 'Không có thao tác phù hợp' : 'Chưa có thao tác nào trong khoảng này'} detail={rows.length ? 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa.' : 'Chọn khoảng thời gian dài hơn để xem thêm.'} icon="history" />}
          <div className="activity-footer">
            <span>Đang hiện {loaded} / {logs.data.total} thao tác</span>
            {loaded < logs.data.total && <Button secondary small onPress={() => setPages(value => value + 1)}>Xem thêm</Button>}
          </div>
        </section>
      )}
    </>
  );
}
