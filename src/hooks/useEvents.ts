import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../app/components/AuthProvider';
import * as eventsApi from '../api/events';
import type { CreateEventData, UpdateEventData, CreateTierData } from '../api/events';

export function useEvents(params?: { limit?: number; offset?: number }) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.listEvents(token!, params),
    enabled: !!token,
  });
}

export function useEvent(id: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getEvent(token!, id!),
    enabled: !!token && !!id,
  });
}

export function useCreateEvent() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventData) => eventsApi.createEvent(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useUpdateEvent() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) =>
      eventsApi.updateEvent(token!, id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
  });
}

export function useDeleteEvent() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useUploadCoverPhoto() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, file }: { eventId: string; file: File }) =>
      eventsApi.uploadCoverPhoto(token!, eventId, file),
    onSuccess: (_res, { eventId }) => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  });
}

export function useCreateTier() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreateTierData }) =>
      eventsApi.createTier(token!, eventId, data),
    onSuccess: (_res, { eventId }) => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  });
}

export function useUpdateTier() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, tierId, data }: { eventId: string; tierId: string; data: Partial<CreateTierData> }) =>
      eventsApi.updateTier(token!, eventId, tierId, data),
    onSuccess: (_res, { eventId }) => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  });
}

export function useDeleteTier() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, tierId }: { eventId: string; tierId: string }) =>
      eventsApi.deleteTier(token!, eventId, tierId),
    onSuccess: (_res, { eventId }) => qc.invalidateQueries({ queryKey: ['event', eventId] }),
  });
}
