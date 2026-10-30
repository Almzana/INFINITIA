/** Error returned by the backend in the shape { error: { code, message } }. */
export class ApiError extends Error {
  status: number
  code: string
  details?: { field?: string; message?: string }[]

  constructor(status: number, code: string, message: string, details?: { field?: string; message?: string }[]) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Fired on window when an API call finds the session gone (see AuthProvider); detail.startedAt = when it was sent. */
export const SESSION_EXPIRED = "auth:session-expired"

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  const startedAt = performance.now()
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: json === undefined ? rest.headers : { "content-type": "application/json", ...rest.headers },
    body: json === undefined ? rest.body : JSON.stringify(json),
  })
  // The session ended (expired, revoked, signed out in another tab): tell AuthProvider to sign out here.
  // Sign-in and password-reset calls answer 401 for wrong input, not for a lost session.
  if (res.status === 401 && !/^\/auth\/(login|forgot|reset)/.test(path)) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED, { detail: { startedAt } }))
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? "HTTP_ERROR", data?.error?.message ?? `Request failed (${res.status})`, data?.error?.details)
  }
  return data as T
}

/**
 * Loads every page of a paginated list endpoint (`{ data, meta: { total } }`), so nothing is
 * silently cut off at the page-size limit. `maxPages` is a safety stop.
 */
export async function fetchAllPages<T>(load: (page: number) => Promise<{ data: T[]; meta: { total: number } }>, maxPages = 50): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const res = await load(page)
    all.push(...res.data)
    if (res.data.length === 0 || all.length >= res.meta.total) break
  }
  return all
}
