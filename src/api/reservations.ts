import { apiRequest } from './client';

export interface AdminReservation {
  id: string;
  reference_number: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'refunded' | 'expired';
  is_complimentary?: boolean;
  created_at: string;
  expires_at: string;
  users: { first_name: string; last_name: string; email: string };
  events: { title?: string; name?: string };
  reservation_items: Array<{
    id: string;
    tiers: { name: string } | null;
    seats: { seat_number: string } | null;
  }>;
  /** Present for admin list; used_at set when ticket scanned at door. */
  tickets?: Array<{ id: string; used_at: string | null; status: string }>;
}

export interface ReservationListParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}

export interface PaginatedReservations {
  data: AdminReservation[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAdminReservations(
  token: string,
  params?: ReservationListParams
): Promise<PaginatedReservations> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString() ? `?${query}` : '';
  return apiRequest(`/reservations${qs}`, {}, token);
}
