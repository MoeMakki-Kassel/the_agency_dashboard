import { apiRequest } from './client';
import type { PaginatedResponse } from './types';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface ContactMessageListParams {
  limit?: number;
  offset?: number;
  search?: string;
  unread_only?: boolean;
}

export async function listContactMessages(
  token: string,
  params?: ContactMessageListParams,
): Promise<PaginatedResponse<ContactMessage>> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  if (params?.search) q.set('search', params.search);
  if (params?.unread_only) q.set('unread_only', 'true');
  const qs = q.toString() ? `?${q}` : '';
  return apiRequest(`/admin/contact-messages${qs}`, {}, token);
}

export async function markContactMessageRead(token: string, id: string): Promise<ContactMessage> {
  return apiRequest(`/admin/contact-messages/${id}/read`, { method: 'PATCH' }, token);
}
