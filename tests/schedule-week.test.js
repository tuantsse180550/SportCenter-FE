import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendanceIndex, attendanceOf, mondayOf, shiftWeek, weekDays, weekTimetable } from '../src/utils/week.js';

test('weeks run Monday to Sunday', () => {
  assert.equal(mondayOf('2026-11-18'), '2026-11-16'); // Wednesday
  assert.equal(mondayOf('2026-11-16'), '2026-11-16'); // Monday itself
  assert.equal(mondayOf('2026-11-22'), '2026-11-16'); // Sunday belongs to the week before it
  assert.equal(mondayOf('2027-01-01'), '2026-12-28'); // across the new year
  assert.equal(shiftWeek('2026-11-16', -1), '2026-11-09'); assert.equal(shiftWeek('2026-11-16', 2), '2026-11-30');
  assert.deepEqual(weekDays('2026-11-16'), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
});

test('timetable puts each session on its day in start-time order and ignores other weeks', () => {
  const days = weekTimetable([
    { _id: 'late', date: '2026-11-17T00:00:00.000Z', startTime: '19:00' },
    { _id: 'early', date: '2026-11-17', startTime: '06:30' },
    { _id: 'sunday', date: '2026-11-22', startTime: '08:00', status: 'CANCELLED' },
    { _id: 'next-week', date: '2026-11-23', startTime: '08:00' },
    { _id: 'no-date' },
  ], '2026-11-16');
  assert.equal(days.length, 7);
  assert.deepEqual(days[1].sessions.map(item => item._id), ['early', 'late']);
  assert.deepEqual(days[6].sessions.map(item => item._id), ['sunday']);
  assert.equal(days.reduce((sum, day) => sum + day.sessions.length, 0), 3);
});

test('attendance is matched to sessions by class, lesson and day', () => {
  const index = attendanceIndex([
    { classId: { _id: 'c1', name: 'Bóng đá' }, lessonId: { _id: 'l1' }, date: '2026-11-16T00:00:00.000Z', status: 'PRESENT' },
    { classId: 'c1', lessonId: 'l2', date: '2026-11-17T00:00:00.000Z', status: 'ABSENT' },
    { classId: 'c2', date: '2026-11-18', status: 'LATE' },
  ]);
  assert.equal(attendanceOf(index, { classId: { _id: 'c1' }, lessonId: 'l1', date: '2026-11-16T00:00:00.000Z' }), 'PRESENT');
  assert.equal(attendanceOf(index, { classId: 'c1', lessonId: 'l2', date: '2026-11-17' }), 'ABSENT');
  // Lesson changed after marking: the class and day still match.
  assert.equal(attendanceOf(index, { classId: 'c1', lessonId: 'other', date: '2026-11-17' }), 'ABSENT');
  assert.equal(attendanceOf(index, { classId: 'c1', lessonId: 'l1', date: '2026-11-19' }), '');
  assert.equal(attendanceOf(index, { classId: 'c2', date: '2026-11-18' }), '');
  assert.equal(attendanceOf(null, { classId: 'c1', date: '2026-11-16' }), '');
});
