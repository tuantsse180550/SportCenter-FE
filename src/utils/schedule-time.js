// Pure date/time helpers for schedule forms (same rules as the mobile app).
// Dates are ISO "YYYY-MM-DD" calendar days, times are 24h "HH:mm".
import { entityId } from '../api/operations';

const pad = value => String(value).padStart(2, '0');
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Monday-first order for the weekday picker (0 = Sunday). */
export const weekdayOptions = [1, 2, 3, 4, 5, 6, 0].map(day => ({ day, label: WEEKDAY_SHORT[day] }));

export function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const weekdayOf = iso => new Date(`${iso}T00:00:00Z`).getUTCDay();
export const shortWeekday = iso => WEEKDAY_SHORT[weekdayOf(iso)];
export const dayMonth = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const formatDateLabel = iso => (isIsoDate(iso) ? `${WEEKDAY_LONG[weekdayOf(iso)]}, ${dayMonth(iso)}/${iso.slice(0, 4)}` : '');
export const addDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export const isTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
export const toMinutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
/** Adds minutes within the same day (clamped to 00:00–23:59). */
export function addMinutes(time, minutes) {
  if (!isTime(time)) return '';
  const total = Math.min(23 * 60 + 59, Math.max(0, toMinutes(time) + minutes));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
export const commonStartTimes = ['06:00', '07:00', '08:00', '09:00', '14:00', '16:00', '17:00', '17:30', '18:00', '18:30', '19:00', '20:00'];
export const sessionLengths = [45, 60, 90, 120];
export function durationLabel(start, end) {
  if (!isTime(start) || !isTime(end) || end <= start) return '';
  const minutes = toMinutes(end) - toMinutes(start);
  if (minutes % 60 === 0) return `${minutes / 60} giờ`;
  return minutes > 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`;
}

/** First `count` dates on/after `start` whose weekday is in `weekdays` (0 = Sunday). */
export function repeatDates(start, weekdays, count) {
  if (!isIsoDate(start) || !weekdays.length || count < 1) return [];
  const dates = [];
  for (let day = start; dates.length < count; day = addDays(day, 1)) if (weekdays.includes(weekdayOf(day))) dates.push(day);
  return dates;
}

/** Lesson ids for `count` sessions from `firstLessonId`, in lesson order, cycling back to the first. */
export function cycleLessons(lessons, firstLessonId, count) {
  const ordered = [...lessons].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map(entityId).filter(Boolean);
  const start = ordered.indexOf(firstLessonId);
  if (start < 0) return Array.from({ length: count }, () => firstLessonId);
  return Array.from({ length: count }, (_, index) => ordered[(start + index) % ordered.length]);
}

export const MAX_REPEAT = 52;

// ---- weekly repeat settings ----
export const defaultRepeat = { enabled: false, weekdays: [], count: '8', advanceLesson: true };
export function repeatCount(settings) {
  const value = Number(settings.count);
  return Number.isInteger(value) && value >= 1 && value <= MAX_REPEAT ? value : 0;
}
/** Dates that will be created; the start date's weekday is always included. */
export function plannedDates(start, settings) {
  if (!isIsoDate(start)) return [];
  if (!settings.enabled) return [start];
  const weekdays = settings.weekdays.length ? settings.weekdays : [weekdayOf(start)];
  return repeatDates(start, weekdays.includes(weekdayOf(start)) ? weekdays : [...weekdays, weekdayOf(start)], repeatCount(settings));
}