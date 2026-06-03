import { apiRequest } from './client';

export interface VenueLayoutSeat {
  key: string;
  section_key: string;
  row: string;
  number: number;
  x: number;
  y: number;
  shape?: 'rect' | 'circle';
  w?: number;
  h?: number;
}

export interface VenueLayout {
  page_w: number;
  page_h: number;
  floor_plan_url?: string | null;
  seats: VenueLayoutSeat[];
  ga_zone?: { type: string; x: number; y: number; w: number; h: number } | null;
}

export interface VenueTierConfig {
  key: string;
  name: string;
  selection_mode: 'assigned' | 'general_admission';
  capacity?: number;
}

export interface VenueTemplate {
  id: string;
  name: string;
  slug: string;
  layout: VenueLayout;
  tier_config: VenueTierConfig[];
  created_at?: string;
  updated_at?: string;
}

export interface VenueTemplateListItem {
  id: string;
  name: string;
  slug: string;
  tier_config: VenueTierConfig[];
  created_at?: string;
  updated_at?: string;
}

export async function listVenueTemplates(token: string) {
  return apiRequest<{ data: VenueTemplateListItem[]; total: number }>(
    '/admin/venue-templates',
    {},
    token,
  );
}

export async function getVenueTemplate(token: string, id: string) {
  return apiRequest<VenueTemplate>(`/admin/venue-templates/${id}`, {}, token);
}

export async function createVenueTemplate(
  token: string,
  data: { name: string; slug?: string; layout?: VenueLayout; tier_config?: VenueTierConfig[] },
) {
  return apiRequest<VenueTemplate>(
    '/admin/venue-templates',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export async function updateVenueTemplate(
  token: string,
  id: string,
  data: Partial<{ name: string; slug: string; layout: VenueLayout; tier_config: VenueTierConfig[] }>,
) {
  return apiRequest<VenueTemplate>(
    `/admin/venue-templates/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

export async function deleteVenueTemplate(token: string, id: string): Promise<void> {
  return apiRequest(`/admin/venue-templates/${id}`, { method: 'DELETE' }, token);
}

export async function uploadVenueFloorPlan(token: string, id: string, file: File, pageW?: number, pageH?: number) {
  const formData = new FormData();
  formData.append('floor_plan', file);
  if (pageW != null) formData.append('page_w', String(pageW));
  if (pageH != null) formData.append('page_h', String(pageH));
  return apiRequest<{ floor_plan_url: string; layout: VenueLayout }>(
    `/admin/venue-templates/${id}/floor-plan`,
    { method: 'POST', body: formData },
    token,
  );
}

export async function provisionEventVenue(
  token: string,
  eventId: string,
  body: { template_id: string; tier_prices?: Record<string, number>; force?: boolean },
) {
  return apiRequest(`/events/${eventId}/provision-venue`, { method: 'POST', body: JSON.stringify(body) }, token);
}
