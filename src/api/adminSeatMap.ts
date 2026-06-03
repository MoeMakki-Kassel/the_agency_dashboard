import { apiRequest } from './client';

export interface AdminSeatMapReservation {
  id: string;
  reference_number?: number | null;
  payment_status: string;
  expires_at?: string | null;
  user: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

export interface AdminSeatMapSeat {
  id: string;
  tier_id: string;
  seat_number: string;
  map_x: number;
  map_y: number;
  status: string;
  section_key: string;
  row: string;
  number: number;
  shape?: 'rect' | 'circle';
  w?: number;
  h?: number;
  reservation: AdminSeatMapReservation | null;
}

export interface AdminSeatMapPayload {
  layout: {
    page_w: number;
    page_h: number;
    floor_plan_url: string | null;
  };
  seats: AdminSeatMapSeat[];
  tiers: Array<{
    id: string;
    name: string;
    price: number;
    venue_tier_key?: string;
    available_quantity: number;
    total_quantity: number;
  }>;
  summary: { available: number; locked: number; booked: number; total: number };
  summary_by_tier: Record<string, { available: number; locked: number; booked: number; total: number }>;
}

export async function fetchAdminEventSeatMap(
  token: string,
  eventId: string,
): Promise<AdminSeatMapPayload> {
  return apiRequest(`/admin/events/${eventId}/seat-map`, {}, token);
}
