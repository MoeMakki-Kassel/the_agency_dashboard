import { apiRequest } from './client';
import type { User } from './types';

export interface UserListParams {
  limit?: number;
  offset?: number;
  search?: string;
  role?: string;
  /** When true, list doorman, secretary, and super_admin only. */
  team?: boolean;
  /** Explicit role filter (repeat or comma-separated on wire). */
  roles?: Array<'customer' | 'doorman' | 'secretary' | 'super_admin'>;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserStats {
  total_customers: number;
  admins_and_managers: number;
  door_scanners: number;
}

export async function listUsers(token: string, params?: UserListParams): Promise<PaginatedUsers> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.search) query.set('search', params.search);
  if (params?.role) query.set('role', params.role);
  if (params?.team) query.set('team', 'true');
  if (params?.roles?.length) {
    for (const r of params.roles) {
      query.append('roles', r);
    }
  }
  const qs = query.toString() ? `?${query}` : '';
  return apiRequest(`/users${qs}`, {}, token);
}

export async function getUserStats(token: string): Promise<UserStats> {
  return apiRequest('/users/stats', {}, token);
}

export async function updateUserRole(token: string, id: string, role: string): Promise<User> {
  return apiRequest(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }, token);
}

export async function updateUserStatus(
  token: string,
  id: string,
  status: 'active' | 'inactive'
): Promise<User> {
  return apiRequest(
    `/users/${id}/status`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    token
  );
}

export interface AdminUserPayload {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  age?: number;
  role: string;
  status?: 'active' | 'inactive';
}

export async function createUser(token: string, payload: AdminUserPayload): Promise<User> {
  return apiRequest('/users', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function updateUser(
  token: string,
  id: string,
  payload: Partial<AdminUserPayload>
): Promise<User> {
  return apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
}

export async function deleteUser(token: string, id: string): Promise<void> {
  return apiRequest(`/users/${id}`, { method: 'DELETE' }, token);
}
