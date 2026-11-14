const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

/** true = permitido. 20 req/min por chave. */
export function allow(key: string, limit = 20, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetRateLimit(): void {
  hits.clear();
}
