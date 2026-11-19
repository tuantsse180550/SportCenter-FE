import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { entityId, referenceLabel } from '../../api/operations';
import { statusLabels } from '../../utils/resource-display';
import { addDays, dayMonth, formatDateLabel, shortWeekday } from '../../utils/schedule-time';
import { bangkokDate } from '../../utils/url';
import { dayOf } from '../../utils/coach-teaching';
import Badge from '../common/Badge';
import CourtArt from '../common/CourtArt';
import Empty from '../common/Empty';
import { Icon } from '../common/Icon';
import PageHeading from '../common/PageHeading';
import QueryStatus from '../common/QueryStatus';

const SESSION_TONES = ['', 'green', 'purple', 'blue'];
const ACTIVITY_TONES = ['green', 'orange', 'blue'];

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }).format(new Date()));
  return hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
};

/**
 * Role dashboard in the ActiveHub design. Pages pass a model:
 * { name, subtitle, bannerText, schedulePath, scheduleLabel, metrics[], schedules[], attention[], bottom (node), activity[], activityLink, activityCta }
 */
export default function DashboardView({ model, loading, error, reload }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = bangkokDate();
  const [day, setDay] = useState(today);
  const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const schedules = model?.schedules || [];
  const daySessions = schedules.filter(item => dayOf(item.date) === day && item.status !== 'CANCELLED')
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const classTone = new Map();
  const toneOf = item => {
    const key = entityId(item.classId) || String(item.classId);
    if (!classTone.has(key)) classTone.set(key, SESSION_TONES[classTone.size % SESSION_TONES.length]);
    return classTone.get(key);
  };

  return (
    <>
      <PageHeading
        title={`${greeting()}, ${model?.name || user?.name || ''}!`}
        description={model?.subtitle}
        actions={<div className="date-chip"><Icon name="calendar" size={17} />{formatDateLabel(today)}</div>}
      />
      <QueryStatus loading={loading} error={error} retry={reload} />
      {!!model?.errors?.length && (
        <div className="alert-box amber" role="alert">
          <Icon name="alert" size={18} />
          <div><p><b>Một phần dữ liệu chưa tải được.</b> {model.errors.join(' · ')}</p></div>
        </div>
      )}

      <section className="welcome-banner">
        <div className="banner-copy">
          <span className="tiny-label"><span /> MỖI NGÀY MỘT BƯỚC TIẾN</span>
          <h2>Kết nối đam mê.<br />Vận hành hiệu quả.</h2>
          <p>{model?.bannerText || 'Tất cả hoạt động của trung tâm, trong một không gian.'}</p>
          <button type="button" onClick={() => navigate(model?.schedulePath || '/workspace/schedules')}>
            {model?.scheduleLabel || 'Xem lịch tập hôm nay'} <Icon name="arrow" size={17} />
          </button>
        </div>
        <CourtArt />
        <div className="banner-note"><span className="status-dot" />Trung tâm đang hoạt động</div>
      </section>

      {model && (
        <>
          <div className="metric-grid">
            {model.metrics.map((metric, index) => (
              <button type="button" key={metric.label} className="metric-card" onClick={() => metric.path && navigate(metric.path)}>
                <div className="metric-label">
                  {metric.label}
                  <span className={`metric-icon ${metric.color || ''}`}><Icon name={metric.icon} size={19} /></span>
                </div>
                <strong className={String(metric.value ?? '—').length > 14 ? 'compact-value' : ''}>{metric.value ?? '—'}</strong>
                <div className="metric-footer">
                  <span className={index === 0 && metric.positive ? 'positive' : ''}>
                    {index === 0 && metric.positive && <Icon name="trend" size={13} />}
                    {metric.detail}
                  </span>
                  <Icon name="right" size={14} />
                </div>
              </button>
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="card flush today-card">
              <div className="card-heading">
                <h2>{model.scheduleTitle || 'Lịch tập'} {day === today ? 'hôm nay' : dayMonth(day)} <span className="count-pill">{daySessions.length}</span></h2>
                <Link className="text-btn" to={model.schedulePath || '/workspace/schedules'}>Xem tất cả <Icon name="arrow" size={15} /></Link>
              </div>
              <div className="week-strip">
                {week.map(date => (
                  <button type="button" key={date} className={day === date ? 'active' : ''} onClick={() => setDay(date)} aria-label={formatDateLabel(date)}>
                    <span>{shortWeekday(date)}</span>
                    <b>{date.slice(8, 10)}</b>
                    <i className={schedules.some(item => dayOf(item.date) === date && item.status !== 'CANCELLED') ? 'has-session' : ''} />
                  </button>
                ))}
              </div>
              <div className="today-list">
                {daySessions.length ? daySessions.map(item => (
                  <button type="button" className="session-row" key={entityId(item)} onClick={() => navigate(model.sessionPath ? model.sessionPath(item) : '/workspace/schedules')}>
                    <div className="session-time"><b>{String(item.startTime)}</b><small>{String(item.endTime)}</small></div>
                    <div className={`session-bar ${toneOf(item)}`} />
                    <div className="session-info">
                      <h3>{referenceLabel(item.classId)}</h3>
                      <span><Icon name="book" size={13} />{referenceLabel(item.lessonId)}<i />{referenceLabel(item.roomId)}</span>
                    </div>
                    <div className="session-right">
                      <Badge status={item.status}>{statusLabels[item.status] || item.status}</Badge>
                    </div>
                    <Icon name="right" size={16} />
                  </button>
                )) : <Empty text="Một khoảng nghỉ để nạp năng lượng" detail="Không có buổi tập vào ngày này." icon="calendar" />}
              </div>
            </section>

            <section className="card flush attention-card">
              <div className="card-heading">
                <h2>Cần chú ý <span className="count-pill amber">{String(model.attention.filter(item => item.urgent).length).padStart(2, '0')}</span></h2>
                <Icon name="bell" size={18} />
              </div>
              {model.attention.map(item => (
                <button type="button" key={item.title} className="attention-item" onClick={() => navigate(item.path)}>
                  <span className={`attention-icon ${item.tone}`}><Icon name={item.icon} size={19} /></span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                    <span className="link-orange">{item.cta} <Icon name="arrow" size={13} /></span>
                  </div>
                </button>
              ))}
              <div className="attention-bottom"><Icon name="shield" size={15} />Đồng bộ mọi vai trò, không bỏ lỡ điều gì.</div>
            </section>
          </div>

          <div className="dashboard-grid bottom-grid">
            {model.bottom}
            <section className="card flush activity-card">
              <div className="card-heading">
                <h2>{model.activityTitle || 'Hoạt động gần đây'}</h2>
                {model.activityLink && <Link className="text-btn" to={model.activityLink}>Xem tất cả <Icon name="arrow" size={15} /></Link>}
              </div>
              <div className="activity-list">
                {model.activity.length ? model.activity.slice(0, 4).map((entry, index) => (
                  <div key={index} className="activity-item">
                    <span className={`activity-icon ${ACTIVITY_TONES[index % 3]}`}><Icon name={entry.icon || 'check'} size={15} /></span>
                    <div>
                      <h3>{entry.title}</h3>
                      <p>{entry.detail}</p>
                      {entry.time && <small>{entry.time}</small>}
                    </div>
                  </div>
                )) : <Empty text="Chưa có hoạt động" detail="Hoạt động mới sẽ xuất hiện tại đây." icon="history" />}
              </div>
              {model.activityCta && (
                <button type="button" className="activity-cta" onClick={() => navigate(model.activityCta.path)}>
                  <Icon name={model.activityCta.icon || 'arrow'} size={17} />{model.activityCta.label}<Icon name="arrow" size={15} />
                </button>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

/** Design "feature" card used at the bottom of member / coach dashboards. */
export function FeatureCard({ title, heading, text, cta, path, icon = 'target' }) {
  const navigate = useNavigate();
  return (
    <section className="card flush">
      <div className="card-heading"><h2>{title}</h2><Icon name={icon} size={20} /></div>
      <div className="feature-plan">
        <span className="metric-icon green"><Icon name="sport" size={26} /></span>
        <h3>{heading}</h3>
        <p>{text}</p>
        <button type="button" className="btn secondary" onClick={() => navigate(path)}>{cta} <Icon name="arrow" size={16} /></button>
      </div>
    </section>
  );
}
