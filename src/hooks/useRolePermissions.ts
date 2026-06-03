import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import {
  getPermissionMatrix,
  getMyPermissions,
  updatePermission,
  type UpdatePermissionPayload,
} from '../api/rolePermissions';

// Used by AdminLayout to filter nav items. Runs for every authenticated user.
export function useMyPermissions() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['myPermissions'],
    queryFn: () => getMyPermissions(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // mirrors backend cache TTL
  });
}

// Used only on the AdminRolePermissions page (super_admin only).
export function usePermissionMatrix() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['rolePermissionMatrix'],
    queryFn: () => getPermissionMatrix(token!),
    enabled: !!token,
  });
}

export function useUpdatePermission() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePermissionPayload) => updatePermission(token!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rolePermissionMatrix'] });
      qc.invalidateQueries({ queryKey: ['myPermissions'] });
    },
  });
}
