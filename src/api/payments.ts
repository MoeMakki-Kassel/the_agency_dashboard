import { apiRequest } from './client';

export interface AdminPaymentSummary {
  paid_total: number;
  paid_count: number;
  pending_checkout_total: number;
  refunded_30d_total: number;
  failed_7d_count: number;
  currency: string;
}

export interface AdminPaymentTransactionRow {
  id: string;
  reference_number: number;
  total_amount: number;
  payment_status: 'paid' | 'failed' | 'refunded';
  payment_reference: string | null;
  created_at: string;
  users: { first_name: string; last_name: string; email: string };
  events: { title?: string };
}

export interface PaginatedPaymentTransactions {
  data: AdminPaymentTransactionRow[];
  total: number;
  limit: number;
  offset: number;
}

export async function getAdminPaymentSummary(token: string): Promise<AdminPaymentSummary> {
  return apiRequest<AdminPaymentSummary>('/admin/payments/summary', {}, token);
}

export async function listAdminPaymentTransactions(
  token: string,
  params?: { limit?: number; offset?: number; search?: string; status?: 'paid' | 'failed' | 'refunded' }
): Promise<PaginatedPaymentTransactions> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  if (params?.search) q.set('search', params.search);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return apiRequest<PaginatedPaymentTransactions>(
    `/admin/payments/transactions${qs ? `?${qs}` : ''}`,
    {},
    token
  );
}

export interface AdminIncompletePaymentRow {
  id: string;
  reference_number: number;
  total_amount: number;
  payment_status: 'pending' | 'expired' | 'cancelled';
  payment_reference: string | null;
  created_at: string;
  expires_at: string;
  user_id: string;
  event_id: string;
  users: { first_name: string; last_name: string; email: string; phone?: string | null };
  events: { title?: string };
  reservation_items: Array<{
    id: string;
    tiers: { name: string } | null;
    seats: { seat_number: string } | null;
  }>;
}

export interface PaginatedIncompletePayments {
  data: AdminIncompletePaymentRow[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAdminIncompletePayments(
  token: string,
  params?: { limit?: number; offset?: number; search?: string; event_id?: string }
): Promise<PaginatedIncompletePayments> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  if (params?.search) q.set('search', params.search);
  if (params?.event_id) q.set('event_id', params.event_id);
  const qs = q.toString();
  return apiRequest<PaginatedIncompletePayments>(
    `/admin/payments/incomplete${qs ? `?${qs}` : ''}`,
    {},
    token
  );
}
