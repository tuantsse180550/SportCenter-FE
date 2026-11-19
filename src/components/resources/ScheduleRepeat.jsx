import Button from '../common/Button';
import { dayMonth, isIsoDate, MAX_REPEAT, plannedDates, repeatCount, shortWeekday, weekdayOf, weekdayOptions } from '../../utils/schedule-time';

/** "Lặp lại hàng tuần" block for new schedules: weekdays + number of sessions. */
export default function ScheduleRepeat({ date, value, onChange, disabled }) {
  const set = patch => onChange({ ...value, ...patch });
  const startDay = isIsoDate(date) ? weekdayOf(date) : -1;
  const weekdays = value.weekdays.length ? value.weekdays : startDay >= 0 ? [startDay] : [];
  const count = repeatCount(value);
  const dates = plannedDates(date, value);

  return (
    <fieldset className="repeat-box" disabled={disabled}>
      <label className="toggle-row">
        <input type="checkbox" role="switch" checked={value.enabled}
          onChange={event => set({ enabled: event.target.checked, weekdays: value.weekdays.length ? value.weekdays : startDay >= 0 ? [startDay] : [] })} />
        <span className="toggle-track" aria-hidden="true" />
        <span>
          <strong>Lặp lại hàng tuần</strong>
          <small className="body">Tạo nhiều buổi cùng giờ và phòng trong một lần lưu.</small>
        </span>
      </label>

      {value.enabled && (
        <div className="stack-sm">
          <span className="field-label">Các ngày trong tuần</span>
          <div className="chip-row" role="group" aria-label="Các ngày trong tuần">
            {weekdayOptions.map(option => (
              <Button key={option.day} small secondary={!weekdays.includes(option.day)} aria-pressed={weekdays.includes(option.day)}
                disabled={option.day === startDay} title={option.label}
                onPress={() => set({ weekdays: weekdays.includes(option.day) ? weekdays.filter(day => day !== option.day) : [...weekdays, option.day] })} />
            ))}
          </div>
          {startDay < 0 && <p className="body small">Chọn ngày học trước để bắt đầu lặp.</p>}

          <div className="row-actions">
            <span className="field-label">Số buổi</span>
            <Button small secondary title="−" aria-label="Bớt 1 buổi" disabled={count <= 1} onPress={() => set({ count: String(Math.max(1, count - 1)) })} />
            <input className="count-input" aria-label="Số buổi" inputMode="numeric" value={value.count}
              onChange={event => set({ count: event.target.value.replace(/\D/g, '').slice(0, 2) })} aria-invalid={!count} />
            <Button small secondary title="+" aria-label="Thêm 1 buổi" disabled={count >= MAX_REPEAT} onPress={() => set({ count: String(Math.min(MAX_REPEAT, count + 1)) })} />
          </div>
          {!count && <p className="error">Số buổi từ 1 đến {MAX_REPEAT}.</p>}

          <label className="check">
            <input type="checkbox" checked={value.advanceLesson} onChange={event => set({ advanceLesson: event.target.checked })} />
            <span>Tự chuyển sang bài tiếp theo mỗi buổi (theo thứ tự bài học của lớp)</span>
          </label>

          {dates.length > 0 && (
            <div className="stack-xs">
              <span className="field-label">Sẽ tạo {dates.length} buổi</span>
              <div className="date-tags">{dates.map(day => <span key={day}>{shortWeekday(day)} {dayMonth(day)}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
