import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ModDefinition } from '@candyfight/shared/mods';
import { storageRequest, StorageUnavailableError } from './storageRequest';

/**
 * REST client + react-query hooks for the mods API (server /mods routes).
 * A 503 means the server has no DATABASE_URL — surfaced as `modsUnavailable`
 * so the UI can suggest connecting a database instead of showing an error.
 */

export interface ModMetadata {
  id: string;
  name: string;
  description: string;
  updated_at: string;
}

export interface ModRecord extends ModMetadata {
  payload: ModDefinition;
}

const request = <T>(path: string, init?: RequestInit) => storageRequest<T>('mods', path, init);

export const fetchModsList = (): Promise<{ mods: ModMetadata[] }> => request('/mods');
export const fetchMod = (id: string): Promise<ModRecord> => request(`/mods/${id}`);

const MODS_KEY = ['mods'];

export const useModsList = () => {
  const query = useQuery({
    queryKey: MODS_KEY,
    queryFn: fetchModsList,
    retry: (failureCount, error) =>
      error instanceof StorageUnavailableError ? false : failureCount < 2,
  });
  return {
    ...query,
    mods: query.data?.mods ?? [],
    modsUnavailable: query.error instanceof StorageUnavailableError,
  };
};

export const useMod = (id: string | null) =>
  useQuery({
    queryKey: [...MODS_KEY, id],
    queryFn: () => fetchMod(id!),
    enabled: id !== null,
  });

export const useCreateMod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModDefinition) =>
      request<ModRecord>('/mods', { method: 'POST', body: JSON.stringify({ payload }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODS_KEY }),
  });
};

export const useUpdateMod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModDefinition }) =>
      request<ModRecord>(`/mods/${id}`, { method: 'PUT', body: JSON.stringify({ payload }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODS_KEY }),
  });
};

export const useDeleteMod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/mods/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODS_KEY }),
  });
};
