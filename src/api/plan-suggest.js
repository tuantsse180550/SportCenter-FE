import { membersApi } from './members';
import { attendancesApi, classesApi, coachesApi, entityId, referenceId, referenceLabel, workoutResultsApi } from './operations';
import { suggestExercises } from '../utils/exercise-suggest';

const newestFirst = items => [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

/**
 * Gathers goal, level, sport and history for a plan target, then builds a suggestion.
 * Returns the member's saved goal/level too, so the form can prefill them. Same as mobile.
 */
export async function loadPlanSuggestion(token, input) {
  const settled = await Promise.allSettled([
    classesApi.list(token),
    coachesApi.myStudents(token),
    input.memberId ? membersApi.list(token) : Promise.resolve([]),
    input.memberId ? workoutResultsApi.list(token) : Promise.resolve([]),
    input.memberId ? attendancesApi.list(token) : Promise.resolve([]),
  ]);
  const value = index => (settled[index].status === 'fulfilled' && Array.isArray(settled[index].value) ? settled[index].value : []);
  const [classes, students, members] = [value(0), value(1), value(2)];
  const results = newestFirst(value(3).filter(item => referenceId(item.memberId) === input.memberId));
  const attendance = value(4).filter(item => referenceId(item.memberId) === input.memberId);
  const member = members.find(item => entityId(item) === input.memberId);
  const classId = input.classId || referenceId(students.find(row => referenceId(row.member) === input.memberId)?.class);
  const classInfo = classes.find(item => entityId(item) === classId);
  const goal = input.goal?.trim() || String(member?.goal || '');
  // The member's saved level wins over the form default; the coach can still change it afterwards.
  const level = String(member?.level || '') || input.level || '';
  const suggestion = suggestExercises({
    subject: classInfo ? referenceLabel(classInfo.subjectId) : '',
    goal, level, forClass: !input.memberId,
    history: {
      results: results.length,
      lastResult: results[0] ? String(results[0].result || '') : undefined,
      lastComment: results[0]?.comment ? String(results[0].comment) : undefined,
      sessions: attendance.length,
      absences: attendance.filter(item => item.status === 'ABSENT').length,
    },
  });
  return { ...suggestion, memberGoal: String(member?.goal || ''), memberLevel: String(member?.level || '') };
}
