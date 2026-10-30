import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import Fastify from "fastify"
import { createAlerter } from "../src/dev/alerts.ts"
import { createMonitor } from "../src/dev/monitor.ts"
import { persistMonitor } from "../src/dev/stats-store.ts"
import { registerErrorHandlers } from "../src/errors.ts"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
const ROUTE = "GET /api/zz-monitor-test"
const clear = async () => {
  await ctx.pool.query("DELETE FROM api_route_stats WHERE route = $1", [ROUTE])
  await ctx.pool.query("DELETE FROM api_failures WHERE route = $1", [ROUTE])
  await ctx.pool.query("DELETE FROM notifications WHERE type = 'dev.server_error'")
}

before(async () => {
  ctx = await setup()
  await clear()
})
after(async () => {
  await clear()
  await ctx.close()
})

/** A tiny app with one route that breaks, wired like the real one. */
async function brokenApp() {
  const app = Fastify({ logger: false })
  registerErrorHandlers(app)
  const monitor = createMonitor({ onServerError: createAlerter(ctx.pool, app.log, { email: false }) })
  monitor.install(app)
  const store = persistMonitor(app, ctx.pool, monitor)
  app.get("/api/zz-monitor-test", async () => {
    throw new Error("secret internal detail")
  })
  await app.ready()
  return { app, monitor, store }
}

const devAlerts = async () => {
  const { rows } = await ctx.pool.query(
    "SELECT n.params FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.type = 'dev.server_error' AND u.username = 'dev' ORDER BY n.id",
  )
  return rows.map((r) => r.params)
}

describe("API monitoring", () => {
  test("a 5xx alerts developers once per quiet period, never other accounts", async () => {
    const { app } = await brokenApp()
    for (let i = 0; i < 3; i++) assert.equal((await app.inject({ method: "GET", url: "/api/zz-monitor-test" })).statusCode, 500)
    await new Promise((r) => setTimeout(r, 300)) // alerts are sent in the background
    const alerts = await devAlerts()
    assert.equal(alerts.length, 1, "throttled to one alert")
    assert.equal(alerts[0].route, ROUTE)
    assert.equal(alerts[0].status, 500)
    const others = await ctx.pool.query(
      "SELECT 1 FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.type = 'dev.server_error' AND NOT u.is_developer",
    )
    assert.equal(others.rowCount, 0)
    await app.close()
  })

  test("counters and 5xx failures are stored (no internal error text)", async () => {
    await clear()
    const { app, store } = await brokenApp()
    await app.inject({ method: "GET", url: "/api/zz-monitor-test?token=abc" })
    await app.inject({ method: "GET", url: "/api/zz-monitor-test" })
    await store.flush()
    const stat = (await ctx.pool.query("SELECT count, server_errors FROM api_route_stats WHERE route = $1", [ROUTE])).rows[0]
    assert.deepEqual({ count: stat.count, serverErrors: stat.server_errors }, { count: 2, serverErrors: 2 })
    const failures = (await ctx.pool.query("SELECT path, code, message FROM api_failures WHERE route = $1", [ROUTE])).rows
    assert.equal(failures.length, 2)
    assert.ok(failures.every((f) => f.path === "/api/zz-monitor-test"), "query strings are not stored")
    assert.ok(failures.every((f) => !String(f.message).includes("secret")), "only the client-safe message")
    await app.close()
  })

  test("the console's stored history and failures are for developers only", async () => {
    const dev = await ctx.as("dev")
    const history = await ctx.inject("GET", "/api/dev/history?hours=24", { cookie: dev })
    assert.equal(history.status, 200)
    assert.ok(Array.isArray(history.body.data))
    const failures = await ctx.inject("GET", "/api/dev/failures", { cookie: dev })
    assert.ok(failures.body.data.some((f: { route: string }) => f.route === ROUTE))
    const spec = await ctx.inject("GET", "/api/dev/spec", { cookie: dev })
    assert.ok(spec.body.paths["/api/leaves"], "the spec lists the API")
    for (const path of ["/api/dev/history", "/api/dev/failures", "/api/dev/spec"]) {
      assert.equal((await ctx.inject("GET", path, { cookie: await ctx.as("admin") })).status, 403, path)
    }
  })
})
