/** In-process TTL cache for metric queries — reduces duplicate DB hits per server instance. */
const TTL_MS = 60_000;

type CacheEntry = { expiresAt: number; value: unknown };

const store = new Map<string, CacheEntry>();

export function metricCacheKey(
  organisationId: string,
  activeRole: string,
  centreIds: string[],
  metricId: string,
  workspaceKey = "all",
) {
  return `${organisationId}:${activeRole}:${workspaceKey}:${centreIds.slice().sort().join(",")}:${metricId}`;
}

export async function withMetricCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  const value = await loader();
  store.set(key, { expiresAt: Date.now() + TTL_MS, value });
  return value;
}

export function clearMetricCache() {
  store.clear();
}
