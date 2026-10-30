import { apiFetch } from "@/lib/api"
import type { HttpMethod } from "@/lib/openapi"

export interface RouteStat {
  route: string
  count: number
  serverErrors: number
  clientErrors: number
  avgMs: number
  maxMs: number
  lastStatus: number
  lastAt: string
}

export interface FailedRequest {
  at: string
  route: string
  path: string
  status: number
  code: string | null
  message: string | null
  ms: number
  reqId: string
}

export interface DevStats {
  startedAt: string
  routes: RouteStat[]
  recent: FailedRequest[]
  server: { node: string; uptimeSec: number; rssMb: number; heapUsedMb: number; env: string }
  db: { ok: boolean; ms: number }
}

export interface HistoryPoint {
  bucket: string
  count: number
  serverErrors: number
  clientErrors: number
  avgMs: number
}

/** Developer accounts only (403 otherwise). */
export const devApi = {
  stats: () => apiFetch<DevStats>("/dev/stats"),
  reset: () => apiFetch<void>("/dev/stats", { method: "DELETE" }),
  spec: () => apiFetch<{ paths: Record<string, never> }>("/dev/spec"),
  /** Stored hourly totals (all routes), up to 90 days back */
  history: (hours: number) => apiFetch<{ data: HistoryPoint[] }>(`/dev/history?hours=${hours}`),
  /** Stored 5xx failures (30 days), survive API restarts */
  failures: (limit = 50) => apiFetch<{ data: FailedRequest[] }>(`/dev/failures?limit=${limit}`),
}

export interface RawResponse {
  status: number
  ms: number
  contentType: string
  /** Pretty-printed when JSON */
  body: string
  size: number
}

/** Send any request with the browser's session cookie and capture the raw result (never throws). */
export async function sendRaw(method: HttpMethod, url: string, body?: string, contentType = "application/json"): Promise<RawResponse> {
  const t0 = performance.now()
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": contentType } : undefined, body: body || undefined })
    const text = await res.text()
    const ms = Math.round(performance.now() - t0)
    const type = res.headers.get("content-type") ?? ""
    let pretty = text
    if (type.includes("json") && text) {
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        /* keep raw */
      }
    } else if (!type.startsWith("text/") && !type.includes("json") && text) {
      pretty = `<${type || "binary"} · ${text.length} bytes>`
    }
    return { status: res.status, ms, contentType: type, body: pretty, size: text.length }
  } catch (err) {
    return { status: 0, ms: Math.round(performance.now() - t0), contentType: "", body: String(err), size: 0 }
  }
}

export type Verdict = "ok" | "denied" | "invalid" | "broken"

/** 2xx ok · 401/403 refused for this role · other 4xx bad input · 5xx or no answer = broken route. */
export function verdictOf(status: number): Verdict {
  if (status >= 200 && status < 400) return "ok"
  if (status === 401 || status === 403) return "denied"
  if (status >= 400 && status < 500) return "invalid"
  return "broken"
}
