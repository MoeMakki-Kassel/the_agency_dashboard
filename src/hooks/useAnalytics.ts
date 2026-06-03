import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { getAnalytics, type AnalyticsPeriod } from '../api/analytics';

export function useAnalytics(period: AnalyticsPeriod = '6m') {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['analytics', period],
    queryFn: () => getAnalytics(token!, period),
    enabled: !!token,
  });
}
