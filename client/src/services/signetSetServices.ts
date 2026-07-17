import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SignetSetDefinition } from '@candyfight/shared/mods';
import { storageRequest, StorageUnavailableError } from './storageRequest';

/**
 * REST client + react-query hooks for the signet sets API (server /signetsets
 * routes) — reusable character rosters, loadable into any mod's PERSONAJES
 * section. Mirrors deckSetServices.ts exactly.
 */

export interface SignetSetMetadata {
  id: string;
  name: string;
  description: string;
  updated_at: string;
}

export interface SignetSetRecord extends SignetSetMetadata {
  payload: SignetSetDefinition;
}

const request = <T>(path: string, init?: RequestInit) => storageRequest<T>('signet sets', path, init);

export const fetchSignetSetsList = (): Promise<{ signetSets: SignetSetMetadata[] }> => request('/signetsets');
export const fetchSignetSet = (id: string): Promise<SignetSetRecord> => request(`/signetsets/${id}`);

const SIGNET_SETS_KEY = ['signetsets'];

export const useSignetSetsList = () => {
  const query = useQuery({
    queryKey: SIGNET_SETS_KEY,
    queryFn: fetchSignetSetsList,
    retry: (failureCount, error) =>
      error instanceof StorageUnavailableError ? false : failureCount < 2,
  });
  return {
    ...query,
    signetSets: query.data?.signetSets ?? [],
    signetSetsUnavailable: query.error instanceof StorageUnavailableError,
  };
};

export const useCreateSignetSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SignetSetDefinition) =>
      request<SignetSetRecord>('/signetsets', { method: 'POST', body: JSON.stringify({ payload }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SIGNET_SETS_KEY }),
  });
};

export const useUpdateSignetSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SignetSetDefinition }) =>
      request<SignetSetRecord>(`/signetsets/${id}`, { method: 'PUT', body: JSON.stringify({ payload }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SIGNET_SETS_KEY }),
  });
};

export const useDeleteSignetSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/signetsets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SIGNET_SETS_KEY }),
  });
};
