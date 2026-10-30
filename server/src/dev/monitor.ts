import type { FastifyInstance } from "fastify"

export interface RouteStat {
  route: string
  count: number
  /** 5xx — the route itself broke */
  serverErrors: number
  /** 4xx — refused or invalid input (often expected) */
  clientErrors: number
  avgMs: number
  maxMs: number
  lastStatus: number
  lastAt: string
}

export interface FailedRequest {
  at: string
  route: string
  /** Path only: query strings can carry tokens */
  path: string
  status: number
  code: string | null
  message: string | null
  ms: number
  reqId: string
}

/** Counters since the last flush to the database (see stats-store.ts). */
export interface Delta {
  route: string
  count: number
  serverErrors: number
  clientErrors: number
  totalMs: number
  maxMs: number
}

const RECENT_MAX = 200
const PENDING_FAILURES_MAX = 500

/**
 * Request statistics per route pattern ("GET /api/leaves/:id", so ids do not split one route):
 * live totals since start for the console, deltas for the database, and a hook for 5xx alerts.
 * Only the client-safe error code and message are kept, never stack traces or request bodies.
 */
export function createMonitor(opts: { onServerError?: (f: FailedRequest) => void } = {}) {
  const startedAt = new Date().toISOString()
  const stats = new Map<string, RouteStat & { totalMs: number }>()
  let deltas = new Map<string, Delta>()
  let pendingFailures: FailedRequest[] = []
  let recent: FailedRequest[] = []
  const errorInfo = new WeakMap<object, { code: string | null; message: string | null }>()

  function count(route: string, status: number, ms: number, at: string) {
    const s = stats.get(route) ?? { route, count: 0, serverErrors: 0, clientErrors: 0, avgMs: 0, maxMs: 0, totalMs: 0, lastStatus: 0, lastAt: at }
    const d = deltas.get(route) ?? { route, count: 0, serverErrors: 0, clientErrors: 0, totalMs: 0, maxMs: 0 }
    for (const x of [s, d]) {
      x.count += 1
      x.totalMs += ms
      x.maxMs = Math.max(x.maxMs, ms)
      if (status >= 500) x.serverErrors += 1
      else if (status >= 400) x.clientErrors += 1
    }
    s.avgMs = Math.round((s.totalMs / s.count) * 10) / 10
    s.lastStatus = status
    s.lastAt = at
    stats.set(route, s)
    deltas.set(route, d)
  }

  function install(app: FastifyInstance) {
    app.addHook("onSend", async (req, reply, payload) => {
      if (reply.statusCode >= 400 && typeof payload === "string") {
        try {
          const e = JSON.parse(payload)?.error
          errorInfo.set(req, { code: typeof e?.code === "string" ? e.code : null, message: typeof e?.message === "string" ? e.message : null })
        } catch {
          /* not JSON */
        }
      }
      return payload
    })

    app.addHook("onResponse", async (req, reply) => {
      const path = req.url.split("?")[0]
      if (!path.startsWith("/api/") || path.startsWith("/api/dev/") || path.startsWith("/api/docs")) return
      const route = `${req.method} ${req.routeOptions.url ?? "(no route)"}`
      const ms = Math.round(reply.elapsedTime * 10) / 10
      const status = reply.statusCode
      const at = new Date().toISOString()
      count(route, status, ms, at)
      if (status < 400) return
      const info = errorInfo.get(req)
      const failed = { at, route, path, status, code: info?.code ?? null, message: info?.message ?? null, ms, reqId: String(req.id) }
      recent.unshift(failed)
      if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX)
      if (status >= 500) {
        if (pendingFailures.length < PENDING_FAILURES_MAX) pendingFailures.push(failed)
        opts.onServerError?.(failed)
      }
    })
  }

  return {
    install,
    snapshot: () => ({
      startedAt,
      routes: [...stats.values()].map(({ totalMs: _t, ...s }) => s).sort((a, b) => b.serverErrors - a.serverErrors || b.count - a.count),
      recent,
    }),
    /** Hand over (and forget) what has not been stored yet. */
    drain() {
      const out = { deltas: [...deltas.values()], failures: pendingFailures }
      deltas = new Map()
      pendingFailures = []
      return out
    },
    reset() {
      stats.clear()
      recent = []
    },
  }
}

export type Monitor = ReturnType<typeof createMonitor>
