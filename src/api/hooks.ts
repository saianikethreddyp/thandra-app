import { skipToken, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PAGE_SIZE } from '@/config';
import { api } from './index';
import type { Booking, Car, ContactsStatus, Hub, Page } from './types';
import type { toGuestBody } from '@/utils/guest';

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

// ---------------------------------------------------------------- booking (no login yet)

export type NewBooking = { car_id: string; start_at: string; end_at: string } & ReturnType<typeof toGuestBody>;

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewBooking) => api.request<Booking>('/v1/public/bookings', { method: 'POST', body: input, auth: false }),
    onSuccess: (b) => {
      qc.setQueryData(['booking', b.id], b); // the confirmation screen reads it from here
      qc.invalidateQueries({ queryKey: ['cars'] }); // availability changed
    },
  });
}

/** The booking just made on this phone. Without an account it only lives in memory, so it is never fetched. */
export const useBooking = (id: string) => useQuery<Booking>({ queryKey: ['booking', id], queryFn: skipToken });

// ---------------------------------------------------------------- contacts (parked until accounts return; nothing in the app calls these now)

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
