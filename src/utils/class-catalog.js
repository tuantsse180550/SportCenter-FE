import { classesApi, classRegistrationsApi, coursePrice, coursesApi, entityId, lessonsApi, referenceId, referenceLabel, schedulesApi } from '../api/operations';
import { dayOf } from './coach-teaching';
import { shortWeekday, weekdayOf } from './schedule-time';
import { videoEmbed } from './video';

const settle = promise => promise.then(items => (Array.isArray(items) ? items : [])).catch(() => []);
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/** Morning < 12:00, afternoon < 17:00, evening after. */
export const daypartOf = time => (time < '12:00' ? 'morning' : time < '17:00' ? 'afternoon' : 'evening');
export const DAYPARTS = [
  { id: 'morning', label: 'Buổi sáng', icon: 'clock' },
  { id: 'afternoon', label: 'Buổi chiều', icon: 'clock' },
  { id: 'evening', label: 'Buổi tối', icon: 'clock' },
  { id: 'weekend', label: 'Cuối tuần', icon: 'calendar' },
];

/** Everything the explore page needs, loaded in parallel; optional sources degrade to empty lists. */
export async function loadCatalog(token) {
  const [classes, courses, schedules, lessons, registrations] = await Promise.all([
    classesApi.list(token),
    settle(coursesApi.list(token)),
    settle(schedulesApi.list(token)),
    settle(lessonsApi.list(token)),
    settle(classRegistrationsApi.list(token)),
  ]);
  return { classes: Array.isArray(classes) ? classes : [], courses, schedules, lessons, registrations };
}

/**
 * One entry per open class: price, coach, timetable summary, lessons (with videos) and the
 * viewer's own registration. `memberId` limits registrations to the signed-in member.
 */
export function buildCatalog(data, { memberId = '', now = Date.now() } = {}) {
  const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
  const courseById = new Map(data.courses.map(item => [entityId(item), item]));
  const sessionsByClass = new Map();
  for (const item of data.schedules) {
    if (item.status === 'CANCELLED') continue;
    const key = referenceId(item.classId);
    sessionsByClass.set(key, [...(sessionsByClass.get(key) || []), item]);
  }
  const lessonsByClass = new Map();
  for (const item of data.lessons) {
    const key = referenceId(item.classId);
    if (key) lessonsByClass.set(key, [...(lessonsByClass.get(key) || []), item]);
  }
  const mine = new Map();
  for (const item of data.registrations) {
    if (memberId && referenceId(item.memberId) !== memberId) continue;
    if (!['CONFIRMED', 'PENDING_PAYMENT'].includes(item.status)) continue;
    const key = referenceId(item.classId);
    if (!mine.has(key) || item.status === 'CONFIRMED') mine.set(key, item);
  }

  return data.classes.flatMap(item => {
    const id = entityId(item);
    const course = courseById.get(referenceId(item.courseId)) || (typeof item.courseId === 'object' ? item.courseId : null);
    if (course?.status === 'INACTIVE') return [];
    const sessions = (sessionsByClass.get(id) || []).sort((a, b) => `${dayOf(a.date)} ${a.startTime}`.localeCompare(`${dayOf(b.date)} ${b.startTime}`));
    const upcoming = sessions.filter(session => dayOf(session.date) >= today);
    const counts = new Map();
    for (const session of sessions) {
      const key = `${session.startTime}–${session.endTime}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const timeRange = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const weekdays = MONDAY_FIRST.filter(day => sessions.some(session => weekdayOf(dayOf(session.date)) === day));
    const lessons = (lessonsByClass.get(id) || []).sort((a, b) => Number(a.order) - Number(b.order));
    const price = coursePrice(course);
    const registration = mine.get(id) || null;
    const first = sessions[0];
    return [{
      id,
      raw: item,
      name: String(item.name || ''),
      subjectId: referenceId(item.subjectId),
      subjectName: referenceLabel(item.subjectId),
      courseName: course ? String(course.name || '') : referenceLabel(item.courseId),
      description: String(course?.description || '').trim(),
      imageUrl: String(course?.imageUrl || ''),
      price,
      // Only worth showing when it rounds to at least 1.000 ₫.
      perSession: typeof price === 'number' && sessions.length && price / sessions.length >= 1000 ? Math.round(price / sessions.length / 1000) * 1000 : undefined,
      coachName: referenceLabel(item.coachId),
      coachLabel: /^hlv(\s|\d|$)/i.test(referenceLabel(item.coachId)) ? referenceLabel(item.coachId) : `HLV ${referenceLabel(item.coachId)}`,
      sessions,
      upcoming,
      nextSession: upcoming[0] || null,
      startsOn: first && dayOf(first.date) > today ? dayOf(first.date) : '',
      finished: sessions.length > 0 && upcoming.length === 0,
      weekdays,
      weekdayLabel: weekdays.map(day => shortWeekday(`2024-01-0${day === 0 ? 7 : day}`)).join(' · '),
      timeRange,
      dayparts: new Set(sessions.map(session => daypartOf(String(session.startTime)))),
      weekend: weekdays.includes(6) || weekdays.includes(0),
      lessons,
      previewLesson: lessons.find(lesson => videoEmbed(lesson.videoUrl)) || null,
      registration,
      enrolled: registration?.status === 'CONFIRMED',
      pending: registration?.status === 'PENDING_PAYMENT',
    }];
  });
}

/** Class to feature on top: the next one to start that the member has not joined, else the next session overall. */
export function featuredClass(entries) {
  // Prefer classes with a real price and more than one session: they make the best showcase.
  const all = entries.filter(entry => !entry.registration && entry.upcoming.length);
  const showcase = all.filter(entry => typeof entry.price === 'number' && entry.price > 0 && entry.sessions.length > 1);
  const open = showcase.length ? showcase : all;
  const starting = open.filter(entry => entry.startsOn).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (starting[0]) return starting[0];
  return open.sort((a, b) => `${dayOf(a.nextSession.date)} ${a.nextSession.startTime}`.localeCompare(`${dayOf(b.nextSession.date)} ${b.nextSession.startTime}`))[0] || null;
}

export const SORTS = [
  { value: 'soon', label: 'Sắp diễn ra' },
  { value: 'price-asc', label: 'Học phí thấp → cao' },
  { value: 'price-desc', label: 'Học phí cao → thấp' },
  { value: 'sessions', label: 'Nhiều buổi nhất' },
];

export function sortCatalog(entries, sort) {
  const next = entry => (entry.nextSession ? `${dayOf(entry.nextSession.date)} ${entry.nextSession.startTime}` : '9999');
  const price = entry => (typeof entry.price === 'number' ? entry.price : Number.MAX_SAFE_INTEGER);
  const sorted = [...entries];
  if (sort === 'price-asc') sorted.sort((a, b) => price(a) - price(b));
  else if (sort === 'price-desc') sorted.sort((a, b) => price(b) - price(a));
  else if (sort === 'sessions') sorted.sort((a, b) => b.sessions.length - a.sessions.length);
  else sorted.sort((a, b) => next(a).localeCompare(next(b)));
  return sorted;
}

/** "Bắt đầu 14/11", "Đang diễn ra", "Đã kết thúc", "Chưa có lịch". */
export function timelineLabel(entry) {
  if (!entry.sessions.length) return 'Chưa có lịch';
  if (entry.startsOn) return `Khai giảng ${entry.startsOn.slice(8, 10)}/${entry.startsOn.slice(5, 7)}`;
  if (entry.finished) return 'Đã kết thúc';
  return 'Đang diễn ra';
}
