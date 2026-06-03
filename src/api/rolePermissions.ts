import { apiRequest } from './client';
import type { RolePermissionMatrix, MyPermissions, RoleResource } from './types';

export async function getPermissionMatrix(token: string): Promise<RolePermissionMatrix> {
  return apiRequest('/admin/role-permissions', {}, token);
}

export async function getMyPermissions(token: string): Promise<MyPermissions> {
  return apiRequest('/admin/role-permissions/me', {}, token);
}

export interface UpdatePermissionPayload {
  role: string;
  resource: RoleResource;
  granted: boolean;
}

export async function updatePermission(
  token: string,
  payload: UpdatePermissionPayload
): Promise<{ id: string; role: string; resource: string; granted: boolean; updated_at: string }> {
  return apiRequest('/admin/role-permissions', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}
