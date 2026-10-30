// Per-account brute-force guard, complementing the per-IP rate limit on /auth/login.
// In-memory: enough for a single API instance; move to the database or Redis if you run several.

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000

const failures = new Map<string, { count: number; first: number }>()

/** Milliseconds until this login may be tried again, or 0 when not locked. */
export function lockedFor(login: string, now = Date.now()) {
  const f = failures.get(login)
  if (!f) return 0
  if (now - f.first > WINDOW_MS) {
    failures.delete(login)
    return 0
  }
  return f.count >= MAX_FAILURES ? WINDOW_MS - (now - f.first) : 0
}

export function recordFailure(login: string, now = Date.now()) {
  const f = failures.get(login)
  if (!f || now - f.first > WINDOW_MS) failures.set(login, { count: 1, first: now })
  else f.count++
  // Keep memory bounded if someone sprays many usernames: drop expired windows first, so a real
  // lock is only ever evicted when 10 000 accounts are locked at the same time
  if (failures.size > 10_000) {
    for (const [k, v] of failures) if (now - v.first > WINDOW_MS) failures.delete(k)
    // Still full: drop a counter that is not (yet) a lock, never an active lock
    if (failures.size > 10_000) {
      for (const [k, v] of failures) {
        if (v.count < MAX_FAILURES) {
          failures.delete(k)
          break
        }
      }
    }
  }
}

export function clearFailures(login: string) {
  failures.delete(login)
}
