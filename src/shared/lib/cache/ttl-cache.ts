const DEFAULT_TTL_MS = 5 * 60 * 1000

type CacheEntry<T> = {
  value?: T
  expiresAt: number
  inflight?: Promise<T>
}

const stores = new Map<string, CacheEntry<unknown>>()

export function clearAppCaches() {
  stores.clear()
}

export function invalidateCache(key: string) {
  stores.delete(key)
}

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now()
  const existing = stores.get(key) as CacheEntry<T> | undefined
  if (existing?.inflight) return existing.inflight
  if (existing && existing.expiresAt > now && existing.value !== undefined) {
    return existing.value
  }

  const inflight = loader()
    .then((value) => {
      stores.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .catch((error) => {
      stores.delete(key)
      throw error
    })

  stores.set(key, {
    value: existing?.value,
    expiresAt: existing?.expiresAt ?? 0,
    inflight,
  })
  return inflight
}
