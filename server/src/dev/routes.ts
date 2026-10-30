import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { requireDeveloper } from "../auth/guard.ts"
import type { Pool } from "../db.ts"
import type { Monitor } from "./monitor.ts"
import { createStatsQueries } from "./stats-store.ts"

const noInput = { querystring: { type: "object", properties: {}, additionalProperties: false } } as const
const dev = (summary: string) => ({ tags: ["dev"], summary })
const round = (n: number) => Math.round(n * 10) / 10

/** Developer Console data, for accounts flagged as developers only (any environment). */
export function devRoutes(pool: Pool, monitor: Monitor, authenticate: preHandlerHookHandler) {
  const queries = createStatsQueries(pool)
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)
    // Accounts flagged as developers only (see scripts/developer.ts); everyone else gets 403
    app.addHook("preHandler", requireDeveloper)

    app.get("/dev/stats", { schema: { ...noInput, ...dev("Live per-route statistics since the server started, latest failed requests, server and database health") } }, async () => {
      const t0 = performance.now()
      let db: { ok: boolean; ms: number }
      try {
        await pool.query("SELECT 1")
        db = { ok: true, ms: round(performance.now() - t0) }
      } catch (err) {
        app.log.error({ err }, "dev stats: database ping failed")
        db = { ok: false, ms: round(performance.now() - t0) }
      }
      const mem = process.memoryUsage()
      return {
        ...monitor.snapshot(),
        server: {
          node: process.version,
          uptimeSec: Math.round(process.uptime()),
          rssMb: Math.round(mem.rss / 1048576),
          heapUsedMb: Math.round(mem.heapUsed / 1048576),
          env: process.env.NODE_ENV ?? "development",
        },
        db,
      }
    })

    app.delete("/dev/stats", { schema: { ...noInput, ...dev("Clear the live statistics (stored history is kept)") } }, async (_req, reply) => {
      monitor.reset()
      return reply.status(204).send()
    })

    app.get<{ Querystring: { hours: number } }>(
      "/dev/history",
      {
        schema: {
          ...dev("Requests, 4xx, 5xx and average time per hour across all routes (stored, up to 90 days)"),
          querystring: { type: "object", properties: { hours: { type: "integer", minimum: 1, maximum: 2160, default: 24 } }, additionalProperties: false },
        },
      },
      async (req) => ({ data: await queries.history(req.query.hours) }),
    )

    app.get<{ Querystring: { limit: number } }>(
      "/dev/failures",
      {
        schema: {
          ...dev("Stored 5xx failures, newest first (kept 30 days, survive restarts)"),
          querystring: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 200, default: 50 } }, additionalProperties: false },
        },
      },
      async (req) => ({ data: await queries.failures(req.query.limit) }),
    )

    // The OpenAPI document for the console's endpoint list, also where Swagger UI is switched off
    app.get("/dev/spec", { schema: { ...noInput, ...dev("OpenAPI document of this API") } }, async () => app.swagger())
  }
}
