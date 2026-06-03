import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import * as eventsApi from '../api/events';

export function useEventOptions(enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['eventOptions'],
    queryFn: () => eventsApi.listEventOptions(token!),
    enabled: enabled && !!token,
    staleTime: 60_000,
  });
}
