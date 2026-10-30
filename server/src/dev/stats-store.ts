import type { FastifyInstance } from "fastify"
import type { Pool } from "../db.ts"
import type { FailedRequest, Monitor } from "./monitor.ts"

const FLUSH_MS = 60_000
const PRUNE_EVERY = 60 // flushes, i.e. hourly

/**
 * Writes the monitor's counters to Postgres once a minute (one upsert into the hourly bucket, one
 * insert of new 5xx failures) and prunes old rows hourly. Stops, with a last flush, when the app closes.
 */
export function persistMonitor(app: FastifyInstance, pool: Pool, monitor: Monitor) {
  let flushes = 0

  async function flush() {
    const { deltas, failures } = monitor.drain()
    try {
      if (deltas.length) {
        await pool.query(
          `INSERT INTO api_route_stats (bucket, route, count, server_errors, client_errors, total_ms, max_ms)
           SELECT date_trunc('hour', now()), * FROM unnest($1::text[], $2::int[], $3::int[], $4::int[], $5::float8[], $6::float8[])
           ON CONFLICT (bucket, route) DO UPDATE SET
             count = api_route_stats.count + EXCLUDED.count,
             server_errors = api_route_stats.server_errors + EXCLUDED.server_errors,
             client_errors = api_route_stats.client_errors + EXCLUDED.client_errors,
             total_ms = api_route_stats.total_ms + EXCLUDED.total_ms,
             max_ms = greatest(api_route_stats.max_ms, EXCLUDED.max_ms)`,
          [deltas.map((d) => d.route), deltas.map((d) => d.count), deltas.map((d) => d.serverErrors), deltas.map((d) => d.clientErrors), deltas.map((d) => d.totalMs), deltas.map((d) => d.maxMs)],
        )
      }
      if (failures.length) {
        const col = <K extends keyof FailedRequest>(k: K) => failures.map((f) => f[k])
        await pool.query(
          `INSERT INTO api_failures (at, route, path, status, code, message, ms, req_id)
           SELECT * FROM unnest($1::timestamptz[], $2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::float8[], $8::text[])`,
          [col("at"), col("route"), col("path").map((p) => p.slice(0, 500)), col("status"), col("code"), col("message").map((m) => m?.slice(0, 500) ?? null), col("ms"), col("reqId")],
        )
      }
      if (++flushes % PRUNE_EVERY === 0) {
        await pool.query("DELETE FROM api_route_stats WHERE bucket < now() - interval '90 days'")
        await pool.query("DELETE FROM api_failures WHERE at < now() - interval '30 days'")
      }
    } catch (err) {
      // Monitoring must never take the API down; the counters of this minute are dropped
      app.log.error({ err }, "monitor flush failed")
    }
  }

  const timer = setInterval(() => void flush(), FLUSH_MS)
  timer.unref()
  app.addHook("onClose", async () => {
    clearInterval(timer)
    await flush()
  })
  return { flush }
}

/** History for the console: totals per hour across all routes, and the stored 5xx failures. */
export function createStatsQueries(pool: Pool) {
  return {
    async history(hours: number) {
      const { rows } = await pool.query(
        `SELECT bucket, sum(count)::int AS count, sum(server_errors)::int AS "serverErrors", sum(client_errors)::int AS "clientErrors",
                round((sum(total_ms) / greatest(sum(count), 1))::numeric, 1)::float AS "avgMs"
           FROM api_route_stats WHERE bucket >= date_trunc('hour', now()) - make_interval(hours => $1 - 1)
          GROUP BY bucket ORDER BY bucket`,
        [hours],
      )
      return rows
    },

    async failures(limit: number) {
      const { rows } = await pool.query(
        `SELECT at, route, path, status, code, message, ms, req_id AS "reqId" FROM api_failures ORDER BY at DESC LIMIT $1`,
        [limit],
      )
      return rows
    },
  }
}
