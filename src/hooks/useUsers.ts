import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import {
  listUsers,
  getUserStats,
  updateUserRole,
  updateUserStatus,
  createUser,
  updateUser,
  deleteUser,
} from '../api/users';
import type { UserListParams, AdminUserPayload } from '../api/users';

export function useAdminUsers(params?: UserListParams) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsers(token!, params),
    enabled: !!token,
  });
}

export function useUserStats() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['userStats'],
    queryFn: () => getUserStats(token!),
    enabled: !!token,
  });
}

export function useUpdateUserRole() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      updateUserRole(token!, id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

export function useUpdateUserStatus() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      updateUserStatus(token!, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

export function useCreateUser() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserPayload) => createUser(token!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

export function useUpdateUser() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminUserPayload> }) =>
      updateUser(token!, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

export function useDeleteUser() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}
