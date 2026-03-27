export interface ApiResponse<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const MAX_ENTRIES = 500;
const store = new Map<string, CacheEntry<unknown>>();

function evictIfNeeded(): void {
  if (store.size <= MAX_ENTRIES) return;
  const oldest = store.keys().next().value;
  if (oldest !== undefined) store.delete(oldest);
}

export function getCached<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key);
  if (!entry) return null;
  return entry as CacheEntry<T>;
}

export function setCache<T>(key: string, data: T): void {
  store.delete(key);
  store.set(key, { data, fetchedAt: Date.now() });
  evictIfNeeded();
}

export function wrapFresh<T>(data: T): ApiResponse<T> {
  return { data, fetchedAt: Date.now(), stale: false };
}

export function wrapStale<T>(entry: CacheEntry<T>): ApiResponse<T> {
  return { data: entry.data, fetchedAt: entry.fetchedAt, stale: true };
}
