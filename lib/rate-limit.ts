type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

/**
 * Returns true if the request is allowed, false if it should be blocked.
 * @param key    Unique identifier (e.g. "ip:1.2.3.4")
 * @param limit  Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
