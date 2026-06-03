import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { listActivityLogs, type ActivityLogParams } from '../api/activityLogs';

export function useActivityLogs(params?: ActivityLogParams) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['activityLogs', params],
    queryFn: () => listActivityLogs(token!, params),
    enabled: !!token,
  });
}
