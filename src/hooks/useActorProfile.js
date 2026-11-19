import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiQuery } from './useApiQuery';
import { coachesApi } from '../api/operations';
import { membersApi } from '../api/members';

/** Member or coach profile of the signed-in user (its _id is the "actor id"). */
export function useActorProfile(enabled = true) {
  const { user, token } = useAuth();
  const role = user?.role;
  const load = useCallback(() => (role === 'MEMBER' ? membersApi.me(token) : coachesApi.me(token)), [token, role]);
  return useApiQuery(load, enabled && !!token && (role === 'MEMBER' || role === 'COACH'));
}
