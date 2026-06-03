import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import * as sponsorsApi from '../api/sponsors';
import type { SponsorInput } from '../api/sponsors';
import type { Sponsor } from '../api/types';

export function useSponsors(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['sponsors', params],
    queryFn: () => sponsorsApi.listSponsors(params),
  });
}

export function useCreateSponsor() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SponsorInput) => sponsorsApi.createSponsor(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsors'] }),
  });
}

export function useUpdateSponsor() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SponsorInput }) =>
      sponsorsApi.updateSponsor(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsors'] }),
  });
}

export function useDeleteSponsor() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sponsorsApi.deleteSponsor(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsors'] }),
  });
}

export function useUploadSponsorLogo() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string | number; file: File }) =>
      sponsorsApi.uploadSponsorLogo(token!, id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sponsors'] }),
  });
}
