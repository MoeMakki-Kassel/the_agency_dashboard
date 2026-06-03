import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { getScannerEvents, scanTicket, assignDoormanToEvent, unassignDoormanFromEvent } from '../api/scanner';
import { listEvents } from '../api/events';

export function useScannerEvents() {
  const { token, user } = useAuth();
  const isDoorman = user?.role === 'doorman';
  return useQuery({
    queryKey: ['scannerEvents', isDoorman],
    queryFn: () =>
      isDoorman
        ? getScannerEvents(token!)
        : listEvents(token!, { limit: 100 }).then(r => r.data),
    enabled: !!token,
  });
}

export function useScanTicket() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: (data: { ticket_code: string; event_id: string }) => scanTicket(token!, data),
  });
}

export function useAssignDoorman() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      assignDoormanToEvent(token!, eventId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scannerEvents'] }),
  });
}

export function useUnassignDoorman() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      unassignDoormanFromEvent(token!, eventId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scannerEvents'] }),
  });
}
