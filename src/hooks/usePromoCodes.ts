import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import * as promoCodesApi from '../api/promoCodes';
import type { PromoCodeInput } from '../api/promoCodes';

export function usePromoCodes(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  event_id?: string;
  active?: string;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['promoCodes', params],
    queryFn: () => promoCodesApi.listPromoCodes(token!, params),
    enabled: !!token,
  });
}

export function useCreatePromoCode() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PromoCodeInput) => promoCodesApi.createPromoCode(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoCodes'] }),
  });
}

export function useUpdatePromoCode() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromoCodeInput> }) =>
      promoCodesApi.updatePromoCode(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoCodes'] }),
  });
}

export function useDeletePromoCode() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promoCodesApi.deletePromoCode(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoCodes'] }),
  });
}
