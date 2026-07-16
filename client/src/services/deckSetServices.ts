import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DeckSetDefinition } from '@candyfight/shared/mods';
import { storageRequest, StorageUnavailableError } from './storageRequest';

/**
 * REST client + react-query hooks for the deck sets API (server /decksets
 * routes) — reusable mazo base + market tiers, loadable into any mod's
 * MAZOS section. Mirrors modServices.ts exactly.
 */

export interface DeckSetMetadata {
  id: string;
  name: string;
  description: string;
  updated_at: string;
}

export interface DeckSetRecord extends DeckSetMetadata {
  payload: DeckSetDefinition;
}

const request = <T>(path: string, init?: RequestInit) => storageRequest<T>('deck sets', path, init);

export const fetchDeckSetsList = (): Promise<{ deckSets: DeckSetMetadata[] }> => request('/decksets');
export const fetchDeckSet = (id: string): Promise<DeckSetRecord> => request(`/decksets/${id}`);

const DECK_SETS_KEY = ['decksets'];

export const useDeckSetsList = () => {
  const query = useQuery({
    queryKey: DECK_SETS_KEY,
    queryFn: fetchDeckSetsList,
    retry: (failureCount, error) =>
      error instanceof StorageUnavailableError ? false : failureCount < 2,
  });
  return {
    ...query,
    deckSets: query.data?.deckSets ?? [],
    deckSetsUnavailable: query.error instanceof StorageUnavailableError,
  };
};

export const useCreateDeckSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeckSetDefinition) =>
      request<DeckSetRecord>('/decksets', { method: 'POST', body: JSON.stringify({ payload }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DECK_SETS_KEY }),
  });
};

export const useUpdateDeckSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DeckSetDefinition }) =>
      request<DeckSetRecord>(`/decksets/${id}`, { method: 'PUT', body: JSON.stringify({ payload }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DECK_SETS_KEY }),
  });
};

export const useDeleteDeckSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/decksets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DECK_SETS_KEY }),
  });
};
