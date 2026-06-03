import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import { listNewsletterSubscribers, type NewsletterListParams } from '../api/newsletterAdmin';

export function useNewsletterSubscribers(params?: NewsletterListParams) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['newsletter-subscribers', params],
    queryFn: () => listNewsletterSubscribers(token!, params),
    enabled: !!token,
  });
}
