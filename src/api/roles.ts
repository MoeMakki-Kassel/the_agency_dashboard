import { apiRequest } from './client';

export interface DashboardRole {
  slug: string;
  display_name: string;
  is_system: boolean;
  can_access_dashboard: boolean;
  created_at: string;
}

export async function listDashboardRoles(token: string): Promise<{ data: DashboardRole[] }> {
  return apiRequest('/admin/roles', {}, token);
}

export async function createDashboardRole(
  token: string,
  display_name: string,
): Promise<DashboardRole> {
  return apiRequest('/admin/roles', {
    method: 'POST',
    body: JSON.stringify({ display_name }),
  }, token);
}
