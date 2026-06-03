import { apiRequest } from './client';
import type { Sponsor, PaginatedResponse } from './types';

export interface SponsorInput {
  sponsor_name: string;
  logo?: string;
}

export async function listSponsors(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Sponsor>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const qs = query.toString() ? `?${query}` : '';
  return apiRequest(`/sponsor/all${qs}`);
}

export async function createSponsor(token: string, data: SponsorInput): Promise<Sponsor> {
  return apiRequest('/sponsor/add-sponsor', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function updateSponsor(token: string, id: string, data: SponsorInput): Promise<Sponsor> {
  return apiRequest(`/sponsor/update/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export async function deleteSponsor(token: string, id: string): Promise<void> {
  return apiRequest(`/sponsor/delete/${id}`, { method: 'DELETE' }, token);
}

export async function uploadSponsorLogo(token: string, id: string | number, file: File): Promise<{ logo_url: string; sponsor: Sponsor }> {
  const form = new FormData();
  form.append('logo', file);
  return apiRequest(`/sponsor/${id}/upload-logo`, { method: 'POST', body: form }, token);
}
