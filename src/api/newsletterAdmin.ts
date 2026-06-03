import { apiRequest } from './client';
import type { PaginatedResponse } from './types';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

export interface NewsletterListParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export async function listNewsletterSubscribers(
  token: string,
  params?: NewsletterListParams,
): Promise<PaginatedResponse<NewsletterSubscriber>> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  if (params?.search) q.set('search', params.search);
  const qs = q.toString() ? `?${q}` : '';
  return apiRequest(`/admin/newsletter-subscribers${qs}`, {}, token);
}
