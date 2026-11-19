// Which roles may create/update/remove each resource in the UI.
// UI gating only — the backend still enforces permissions.
import { referenceId } from '../api/operations';

const writeRoles = {
  'class-registrations': ['MEMBER', 'RECEPTIONIST', 'CENTER_MANAGER'],
  attendances: ['CENTER_MANAGER', 'COACH', 'RECEPTIONIST'],
  'lesson-progress': ['COACH', 'CENTER_MANAGER'], // members only view their progress
  'workout-plans': ['COACH'],
  'workout-results': ['COACH'],
};

export const personalResources = ['class-registrations', 'attendances', 'lesson-progress', 'workout-plans', 'workout-results'];

export function isOwnRecord(resource, role, actorId, item) {
  if (!actorId) return false;
  // A class-wide plan has no memberId; the BE only returns it for classes the member is confirmed in.
  if (role === 'MEMBER' && resource === 'workout-plans' && !referenceId(item.memberId) && referenceId(item.classId)) return true;
  if (role === 'MEMBER') return referenceId(item.memberId) === actorId;
  if (role === 'COACH' && (resource === 'workout-plans' || resource === 'classes')) return referenceId(item.coachId) === actorId;
  if (role === 'COACH' && resource === 'schedules') {
    const classData = item.classId;
    return !!classData && typeof classData === 'object' && referenceId(classData.coachId) === actorId;
  }
  if (role === 'COACH' && resource === 'workout-results') {
    const plan = item.workoutPlanId;
    return !!plan && typeof plan === 'object' && referenceId(plan.coachId) === actorId;
  }
  return true;
}

/** action: 'create' | 'update' | 'remove' */
export function canUseResource(resource, role, action, item, actorId = '') {
  if (action === 'remove' && ['class-registrations', 'lesson-progress', 'workout-results', 'activity-logs'].includes(resource)) return false;
  if (action === 'update' && resource === 'activity-logs') return false;
  if (!(writeRoles[resource] || ['CENTER_MANAGER']).includes(role)) return false;
  const needsOwner = (role === 'MEMBER' && personalResources.includes(resource)) || (role === 'COACH' && ['workout-plans', 'workout-results'].includes(resource));
  return !needsOwner || (!!actorId && (!item || isOwnRecord(resource, role, actorId, item)));
}
