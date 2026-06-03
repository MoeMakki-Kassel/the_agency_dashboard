import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { getPublicSettings, getSettings, updateSettings, type SettingsUpdate } from '../api/settings';

/** Unauthenticated; safe for login / marketing surfaces. */
export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: getPublicSettings,
    staleTime: 5 * 60_000,
  });
}

export function useSettings() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(token!),
    enabled: !!token,
  });
}

export function useUpdateSettings() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SettingsUpdate) => updateSettings(token!, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings'] });
      void qc.invalidateQueries({ queryKey: ['settings', 'public'] });
    },
  });
}
