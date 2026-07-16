import { BACKEND_URL } from '../config';

/**
 * Shared fetch helper for the mods/decksets REST resources: both live on the
 * same koa server, behind the same DATABASE_URL, with the same 503-when-
 * unconfigured contract.
 */
export class StorageUnavailableError extends Error {
  constructor(resource: string) {
    super(`${resource} storage not configured`);
    this.name = 'StorageUnavailableError';
  }
}

export const storageRequest = async <T>(resource: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (response.status === 503) throw new StorageUnavailableError(resource);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `${resource} API error (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};
