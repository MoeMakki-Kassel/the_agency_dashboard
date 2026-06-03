import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { listContactMessages, markContactMessageRead, type ContactMessageListParams } from '../api/contactMessages';

export function useContactMessages(params?: ContactMessageListParams) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['contact-messages', params],
    queryFn: () => listContactMessages(token!, params),
    enabled: !!token,
  });
}

export function useMarkContactMessageRead() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markContactMessageRead(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-messages'] }),
  });
}
