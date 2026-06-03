import { apiRequest } from './client';
import type { Event, Tier, Seat, PaginatedResponse } from './types';
import { normalizeEventVisibility } from '../app/utils/eventVisibility';

function withNormalizedVisibility(event: Event): Event {
  return { ...event, visibility: normalizeEventVisibility(event.visibility) };
}

export interface CreateEventData {
  title: string;
  subtitle?: string;
  date_time: string;
  end_date_and_time?: string | null;
  /** null clears int2 column (all ages). */
  age_restriction?: number | null;
  location_name: string;
  full_address?: string;
  location_lat?: number;
  location_lng?: number;
  map_embed_url?: string;
  parking_info?: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  visibility?: 'public' | 'unlisted';
  sales_start_date?: string;
  sales_end_date?: string;
  max_tickets_per_order?: number;
  sponsors?: string[];
  venue_template_id?: string | null;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface CreateTierData {
  name: string;
  price: number;
  total_quantity: number;
  seats_per_row?: number;
  row_label_start?: string | null;
}

export interface EventOption {
  id: string;
  title: string;
}

export async function listEventOptions(token: string): Promise<{ data: EventOption[] }> {
  return apiRequest('/events/options/list', {}, token);
}

export async function listEvents(token: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Event>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const qs = query.toString() ? `?${query}` : '';
  const res = await apiRequest<PaginatedResponse<Event>>(`/events${qs}`, {}, token);
  return { ...res, data: res.data.map(withNormalizedVisibility) };
}

export async function getEvent(token: string, id: string): Promise<Event> {
  const event = await apiRequest<Event>(`/events/${id}`, {}, token);
  return withNormalizedVisibility(event);
}

export async function createEvent(token: string, data: CreateEventData): Promise<Event> {
  const event = await apiRequest<Event>('/events', { method: 'POST', body: JSON.stringify(data) }, token);
  return withNormalizedVisibility(event);
}

export async function updateEvent(token: string, id: string, data: UpdateEventData): Promise<Event> {
  const event = await apiRequest<Event>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
  return withNormalizedVisibility(event);
}

export async function deleteEvent(token: string, id: string): Promise<void> {
  return apiRequest(`/events/${id}`, { method: 'DELETE' }, token);
}

export async function uploadCoverPhoto(token: string, eventId: string, file: File): Promise<{ cover_photo_url: string }> {
  const formData = new FormData();
  formData.append('cover_photo', file);
  return apiRequest(`/events/${eventId}/cover-photo`, { method: 'POST', body: formData }, token);
}

export async function createTier(token: string, eventId: string, data: CreateTierData): Promise<Tier> {
  return apiRequest(`/events/${eventId}/tiers`, { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function batchCreateTiers(token: string, eventId: string, tiers: CreateTierData[]): Promise<Tier[]> {
  return apiRequest(`/events/${eventId}/tiers/batch`, { method: 'POST', body: JSON.stringify({ tiers }) }, token);
}

export async function updateTier(token: string, eventId: string, tierId: string, data: Partial<CreateTierData>): Promise<Tier> {
  return apiRequest(`/events/${eventId}/tiers/${tierId}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export async function deleteTier(token: string, eventId: string, tierId: string): Promise<void> {
  return apiRequest(`/events/${eventId}/tiers/${tierId}`, { method: 'DELETE' }, token);
}

export async function getTierSeats(token: string, eventId: string, tierId: string): Promise<Seat[]> {
  return apiRequest(`/events/${eventId}/tiers/${tierId}/seats`, {}, token);
}

export interface ProvisionVenueResult {
  skipped?: boolean;
  incremental?: boolean;
  tiers?: unknown[];
  map_seat_count?: number;
  template_layout_seat_count?: number;
  released_locks?: number;
  seats_added?: number;
  seats_removed?: number;
  coords_updated?: number;
}

export interface VenueSeatingSyncStatus {
  has_venue_template: boolean;
  venue_template_id?: string;
  template_name?: string;
  template_map_seat_count: number;
  event_map_seat_count: number;
  in_sync: boolean;
}

export async function getEventVenueSeatingSync(token: string, eventId: string) {
  return apiRequest<VenueSeatingSyncStatus>(`/events/${eventId}/venue-seating-sync`, {}, token);
}

export async function provisionEventVenue(
  token: string,
  eventId: string,
  body: { template_id: string; tier_prices?: Record<string, number>; force?: boolean },
) {
  return apiRequest<ProvisionVenueResult>(
    `/events/${eventId}/provision-venue`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
}
