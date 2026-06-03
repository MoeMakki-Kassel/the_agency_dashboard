import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import {
  getAdminPaymentSummary,
  listAdminPaymentTransactions,
  listAdminIncompletePayments,
  type AdminPaymentSummary,
  type PaginatedPaymentTransactions,
  type PaginatedIncompletePayments,
} from '../api/payments';

export function useAdminIncompletePayments(params: {
  search?: string;
  eventId?: string;
}) {
  const { token } = useAuth();
  return useQuery<PaginatedIncompletePayments>({
    queryKey: ['adminIncompletePayments', 'v2', params.search, params.eventId],
    queryFn: () =>
      listAdminIncompletePayments(token!, {
        limit: 100,
        offset: 0,
        search: params.search || undefined,
        event_id: params.eventId && params.eventId !== '__all__' ? params.eventId : undefined,
      }),
    enabled: !!token,
  });
}

export function useAdminPaymentSummary() {
  const { token } = useAuth();
  return useQuery<AdminPaymentSummary>({
    queryKey: ['adminPaymentSummary'],
    queryFn: () => getAdminPaymentSummary(token!),
    enabled: !!token,
  });
}

export function useAdminPaymentTransactions(params: {
  search?: string;
  status?: '' | 'paid' | 'failed' | 'refunded';
}) {
  const { token } = useAuth();
  const status = params.status || undefined;
  return useQuery<PaginatedPaymentTransactions>({
    queryKey: ['adminPaymentTransactions', params.search, status],
    queryFn: () =>
      listAdminPaymentTransactions(token!, {
        limit: 100,
        offset: 0,
        search: params.search || undefined,
        status,
      }),
    enabled: !!token,
  });
}
