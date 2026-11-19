import { useCallback } from 'react';
import { attendancesApi } from '../api/operations';
import { useApiQuery } from './useApiQuery';

export function useScheduleAttendances(token, scheduleId) {
  const load = useCallback(() => attendancesApi.bySchedule(token, scheduleId), [token, scheduleId]);
  return useApiQuery(load, !!token && !!scheduleId);
}
