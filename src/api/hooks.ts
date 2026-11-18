import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PAGE_SIZE } from '@/config';
import { api } from './index';
import type { Booking, Car, ContactsStatus, Hub, Page } from './types';

// ---------------------------------------------------------------- browse (no login needed)

export const useHubs = () =>
  useQuery({ queryKey: ['hubs'], queryFn: async () => (await api.request<{ data: Hub[] }>('/v1/public/hubs', { auth: false })).data, staleTime: 5 * 60_000 });

export type CarFilter = { hubId?: string; from?: Date; to?: Date };

/** Cars, optionally only those free for the whole window. */
export function useCars({ hubId, from, to }: CarFilter) {
  const windowKey = from && to ? `${from.toISOString()}|${to.toISOString()}` : '';
  return useInfiniteQuery({
    queryKey: ['cars', hubId ?? 'all', windowKey],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<Page<Car>>('/v1/public/cars', {
        auth: false,
        query: { hub_id: hubId, from: from && to ? from.toISOString() : undefined, to: from && to ? to.toISOString() : undefined, limit: PAGE_SIZE, offset: pageParam },
      }),
    getNextPageParam: (last) => (last.offset + last.data.length < last.total ? last.offset + last.limit : undefined),
  });
}

export const useCar = (id: string) => useQuery({ queryKey: ['car', id], queryFn: () => api.request<Car>(`/v1/public/cars/${id}`, { auth: false }) });

export const flatten = <T,>(pages?: { pages: Page<T>[] }) => pages?.pages.flatMap((p) => p.data) ?? [];

// ---------------------------------------------------------------- bookings

export function useMyBookings() {
  return useInfiniteQuery({
    queryKey: ['bookings'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.request<Page<Booking>>('/v1/customer/bookings', { query: { limit: PAGE_SIZE, offset: pageParam } }),
    getNextPageParam: (last) => (last.offset + last.data.length < last.total ? last.offset + last.limit : undefined),
  });
}

export const useBooking = (id: string) => useQuery({ queryKey: ['booking', id], queryFn: () => api.request<Booking>(`/v1/customer/bookings/${id}`) });

export type NewBooking = { car_id: string; start_at: string; end_at: string };

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewBooking) => api.request<Booking>('/v1/customer/bookings', { method: 'POST', body: input }),
    onSuccess: (b) => {
      qc.setQueryData(['booking', b.id], b);
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['cars'] }); // availability changed
    },
  });
}

export function useCancelBooking(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.request<Booking>(`/v1/customer/bookings/${id}/cancel`, { method: 'POST' }),
    onSuccess: (b) => {
      qc.setQueryData(['booking', id], b);
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['cars'] });
    },
  });
}

// ---------------------------------------------------------------- contacts

export const useContactsStatus = () => useQuery({ queryKey: ['contacts-status'], queryFn: () => api.request<ContactsStatus>('/v1/customer/contacts/status') });

export type ContactInput = { name?: string; phone: string };

export function useSyncContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contacts: ContactInput[]) => api.request<{ received: number; added: number; updated: number; skipped: number; total: number }>('/v1/customer/contacts/sync', { method: 'POST', body: { contacts } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts-status'] }),
  });
}

export function useDeleteContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => api.request<{ deleted: number }>('/v1/customer/contacts/deletion', { method: 'POST', body: reason ? { reason } : {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts-status'] }),
  });
}

export function useUpdateName() {
  return useMutation({ mutationFn: (name: string) => api.request('/v1/customer/me', { method: 'PATCH', body: { name } }) });
}
