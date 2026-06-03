import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { listAdminReservations } from '../api/reservations';
import type { ReservationListParams } from '../api/reservations';

export function useAdminReservations(params?: ReservationListParams) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['reservations', params],
    queryFn: () => listAdminReservations(token!, params),
    enabled: !!token,
  });
}
