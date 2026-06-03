import { apiRequest } from './client';
import type { PaginatedResponse, PromoCode, PromoDiscountType } from './types';

export interface PromoCodeInput {
  code: string;
  discount_type: PromoDiscountType;
  discount_percent?: number;
  discount_amount?: number | null;
  usage_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  event_id?: string | null;
  applicable_currencies?: string[];
  active?: boolean;
}

export async function listPromoCodes(
  token: string,
  params?: { limit?: number; offset?: number; search?: string; event_id?: string; active?: string },
): Promise<PaginatedResponse<PromoCode>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.search) query.set('search', params.search);
  if (params?.event_id) query.set('event_id', params.event_id);
  if (params?.active) query.set('active', params.active);
  const qs = query.toString() ? `?${query}` : '';
  return apiRequest(`/admin/promo-codes${qs}`, {}, token);
}

export async function createPromoCode(token: string, data: PromoCodeInput): Promise<PromoCode> {
  return apiRequest('/admin/promo-codes', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function updatePromoCode(token: string, id: string, data: Partial<PromoCodeInput>): Promise<PromoCode> {
  return apiRequest(`/admin/promo-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export async function deletePromoCode(token: string, id: string): Promise<void> {
  return apiRequest(`/admin/promo-codes/${id}`, { method: 'DELETE' }, token);
}
