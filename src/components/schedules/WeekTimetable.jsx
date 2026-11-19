import { useState } from 'react';
import { referenceLabel } from '../../api/operations';
import { attendanceIndex, attendanceOf, mondayOf, shiftWeek, weekTimetable } from '../../utils/week';
import Button from '../common/Button';
import { Icon } from '../common/Icon';

const DAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const dm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const minutesOf = time => (/^\d{2}:\d{2}/.test(String(time || '')) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null);
const lengthOf = item => {
  const start = minutesOf(item.startTime);
  const end = minutesOf(item.endTime);
  return start !== null && end !== null && end > start ? end - start : 0;
};
const hours = minutes => (minutes >= 60 ? `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}` : `${minutes} phút`);
const weekName = offset => (offset === 0 ? 'Tuần này' : offset === 1 ? 'Tuần sau' : offset === -1 ? 'Tuần trước' : offset > 0 ? `${offset} tuần sau` : `${-offset} tuần trước`);
/** Vietnam wall-clock "YYYY-MM-DD HH:mm", to tell upcoming sessions from past ones. */
const nowInVietnam = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
const startOf = item => `${String(item.date || '').slice(0, 10)} ${item.startTime || ''}`;
const MARKS = {
  PRESENT: { label: 'Có mặt', icon: 'checkCircle', className: 'present' },
  ABSENT: { label: 'Vắng', icon: 'close', className: 'absent' },
  '': { label: 'Chưa điểm danh', icon: 'clock', className: 'unmarked' },
};

/**
 * Member's weekly timetable, Monday → Sunday, with previous / current / next week.
 * sessions: schedule records of any week; toneOf(item) → 'orange' | 'green' | 'purple' | 'blue';
 * onOpen(item) opens a session; onExplore() leads to class registration when there is nothing scheduled.
 * attendance: the member's attendance records (null while loading or unavailable): sessions that
 * have started show "Có mặt", "Vắng" or "Chưa điểm danh".
 */
export default function WeekTimetable({ sessions, today, toneOf = () => 'orange', onOpen, onExplore, attendance = null }) {
  const thisWeek = mondayOf(today);
  const [monday, setMonday] = useState(thisWeek);
  const days = weekTimetable(sessions, monday);
  const offset = Math.round((Date.parse(monday) - Date.parse(thisWeek)) / (7 * 86400000));
  const live = days.flatMap(day => day.sessions).filter(item => item.status !== 'CANCELLED');
  const total = live.reduce((sum, item) => sum + lengthOf(item), 0);
  const now = nowInVietnam();
  const next = [...(sessions || [])].filter(item => item.status !== 'CANCELLED' && startOf(item) >= now).sort((a, b) => startOf(a).localeCompare(startOf(b)))[0];
  const nextDay = next ? String(next.date).slice(0, 10) : '';
  const nextIndex = nextDay ? (new Date(`${nextDay}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const marks = attendance ? attendanceIndex(attendance) : null;
  const markOf = item => (marks && item.status !== 'CANCELLED' && startOf(item) < now ? attendanceOf(marks, item) : null);
  const held = marks ? live.filter(item => startOf(item) < now) : [];
  const present = held.filter(item => markOf(item) === 'PRESENT').length;
  const absent = held.filter(item => markOf(item) === 'ABSENT').length;

  return (
    <section className="card timetable" aria-label="Thời khóa biểu tuần">
      <header className="timetable-head">
        <div className="timetable-title">
          <span className="timetable-eyebrow">THỜI KHÓA BIỂU · {weekName(offset).toUpperCase()}</span>
          <h2>{dm(monday)} – {dm(days[6].day)}/{days[6].day.slice(0, 4)}</h2>
          <div className="timetable-stats">
            <span><Icon name="calendar" size={14} />{live.length ? `${live.length} buổi tập` : 'Không có buổi tập'}</span>
            {total > 0 && <span><Icon name="clock" size={14} />{hours(total)}</span>}
            {held.length > 0 && <span className="stat-present"><Icon name="checkCircle" size={14} />Có mặt {present}/{held.length} buổi đã học</span>}
            {absent > 0 && <span className="stat-absent"><Icon name="close" size={14} />Vắng {absent}</span>}
          </div>
        </div>
        <div className="timetable-nav" role="group" aria-label="Chuyển tuần">
          <button type="button" className="timetable-arrow" aria-label="Tuần trước" title="Tuần trước" onClick={() => setMonday(current => shiftWeek(current, -1))}><Icon name="left" size={18} /></button>
          <button type="button" className={`timetable-today${offset === 0 ? ' active' : ''}`} disabled={offset === 0} onClick={() => setMonday(thisWeek)}>Tuần này</button>
          <button type="button" className="timetable-arrow" aria-label="Tuần sau" title="Tuần sau" onClick={() => setMonday(current => shiftWeek(current, 1))}><Icon name="right" size={18} /></button>
        </div>
      </header>

      {next && (
        <div className={`timetable-next tone-${toneOf(next)}`}>
          <span className="timetable-next-icon"><Icon name="sport" size={18} /></span>
          <div>
            <small>Buổi tiếp theo · {DAY_LONG[nextIndex]} {dm(nextDay)} · {next.startTime} – {next.endTime}</small>
            <b>{referenceLabel(next.classId)}</b>
          </div>
          {mondayOf(nextDay) !== monday
            ? <Button secondary small onPress={() => setMonday(mondayOf(nextDay))}>Xem tuần đó</Button>
            : <Button small onPress={() => onOpen?.(next)}>Chi tiết buổi</Button>}
        </div>
      )}

      {!sessions?.length ? (
        <div className="timetable-empty">
          <span><Icon name="calendar" size={26} /></span>
          <h3>Chưa có lịch tập</h3>
          <p>Lịch xuất hiện sau khi đăng ký lớp được xác nhận và thanh toán.</p>
          {onExplore && <Button icon="arrow" onPress={onExplore}>Khám phá và đăng ký lớp</Button>}
        </div>
      ) : (
        <div className="timetable-grid">
          {days.map(({ day, sessions: items }, index) => {
            const past = day < today;
            return (
              <div key={day} className={`timetable-day${day === today ? ' today' : ''}${past ? ' past' : ''}${items.length ? '' : ' rest-day'}`}>
                <div className="timetable-date">
                  <span className="timetable-weekday">{DAY_SHORT[index]}<em>{DAY_LONG[index]}</em></span>
                  <span className="timetable-daynum">{day.slice(8, 10)}</span>
                  {day === today && <span className="timetable-tag">Hôm nay</span>}
                </div>
                <div className="timetable-sessions">
                  {items.map(item => {
                    const cancelled = item.status === 'CANCELLED';
                    const mark = markOf(item);
                    return (
                      <button type="button" key={String(item._id || item.id)} onClick={() => onOpen?.(item)}
                        className={`timetable-session tone-${toneOf(item)}${cancelled ? ' cancelled' : ''}${startOf(item) < now ? ' done' : ''}`}
                        title={cancelled ? 'Buổi này đã hủy' : mark !== null ? `${MARKS[mark].label} · Xem chi tiết buổi` : 'Xem chi tiết buổi'}>
                        <span className="timetable-time">{item.startTime} – {item.endTime}</span>
                        <b>{referenceLabel(item.classId)}</b>
                        {item.lessonId && <span className="timetable-lesson">{referenceLabel(item.lessonId)}</span>}
                        <span className="timetable-room"><Icon name="room" size={12} />{cancelled ? 'Buổi đã hủy' : referenceLabel(item.roomId)}</span>
                        {mark !== null && <span className={`timetable-mark ${MARKS[mark].className}`}><Icon name={MARKS[mark].icon} size={12} />{MARKS[mark].label}</span>}
                      </button>
                    );
                  })}
                  {!items.length && <span className="timetable-free">Nghỉ</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
