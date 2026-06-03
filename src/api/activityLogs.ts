import { apiRequest } from './client';
import type { ActivityLog, PaginatedResponse } from './types';

export interface ActivityLogParams {
  limit?: number;
  offset?: number;
  action?: string;
  resource_type?: string;
  user_id?: string;
  from?: string;
  to?: string;
}

export async function listActivityLogs(
  token: string,
  params?: ActivityLogParams
): Promise<PaginatedResponse<ActivityLog>> {
  const q = new URLSearchParams();
  if (params?.limit !== undefined)  q.set('limit',         String(params.limit));
  if (params?.offset !== undefined) q.set('offset',        String(params.offset));
  if (params?.action)               q.set('action',        params.action);
  if (params?.resource_type)        q.set('resource_type', params.resource_type);
  if (params?.user_id)              q.set('user_id',       params.user_id);
  if (params?.from)                 q.set('from',          params.from);
  if (params?.to)                   q.set('to',            params.to);
  const qs = q.toString() ? `?${q}` : '';
  return apiRequest(`/admin/activity-logs${qs}`, {}, token);
}
