const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, { value: string; at: number }>();

export const cacheKey = (pointId: string, normalizedText: string) => `${pointId}|${normalizedText}`;

export function cacheGet(key: string, now = Date.now()): string | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (now - e.at > TTL_MS) { store.delete(key); return undefined; }
  return e.value;
}

export function cacheSet(key: string, value: string, now = Date.now()): void {
  if (store.size > 500) store.clear();
  store.set(key, { value, at: now });
}

export function cacheClear(): void { store.clear(); }
