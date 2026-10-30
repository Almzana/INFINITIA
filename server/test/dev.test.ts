import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
before(async () => {
  ctx = await setup()
})
after(() => ctx.close())

describe("developer console stats", () => {
  test("needs a signed-in developer account; business roles alone are not enough", async () => {
    assert.equal((await ctx.inject("GET", "/api/dev/stats")).status, 401)
    for (const who of ["staff", "hr", "admin"] as const) {
      assert.equal((await ctx.inject("GET", "/api/dev/stats", { cookie: await ctx.as(who) })).status, 403, who)
      assert.equal((await ctx.inject("DELETE", "/api/dev/stats", { cookie: await ctx.as(who) })).status, 403, who)
    }
    const me = await ctx.inject("GET", "/api/auth/me", { cookie: await ctx.as("dev") })
    assert.equal(me.body.user.isDeveloper, true)
    assert.equal(me.body.user.role, "staff", "the dev account keeps the lowest business role")
  })

  test("counts requests per route pattern and keeps failed ones with their safe error code", async () => {
    const cookie = await ctx.as("dev")
    assert.equal((await ctx.inject("DELETE", "/api/dev/stats", { cookie })).status, 204)
    await ctx.inject("GET", "/api/rooms", { cookie })
    await ctx.inject("GET", "/api/rooms", { cookie })
    await ctx.inject("GET", "/api/audit?secret=abc", { cookie }) // dev is staff → 403

    const res = await ctx.inject("GET", "/api/dev/stats", { cookie })
    assert.equal(res.status, 200)
    assert.equal(res.body.db.ok, true)
    const rooms = res.body.routes.find((r: { route: string }) => r.route === "GET /api/rooms")
    assert.equal(rooms.count, 2)
    assert.equal(rooms.serverErrors, 0)
    const failed = res.body.recent[0]
    assert.equal(failed.route, "GET /api/audit")
    assert.equal(failed.status, 403)
    assert.equal(failed.code, "FORBIDDEN")
    assert.equal(failed.path, "/api/audit", "query string is not stored")
    // The console's own calls are not counted
    assert.ok(!res.body.routes.some((r: { route: string }) => r.route.includes("/api/dev/")))
  })

  test("an account without an employee record reads an empty timesheet but cannot save one", async () => {
    const cookie = await ctx.as("dev")
    const read = await ctx.inject("GET", "/api/timesheet?from=2026-10-01&to=2026-10-07", { cookie })
    assert.equal(read.status, 200)
    assert.deepEqual(read.body.data, [])
    // Asking for someone else is still refused
    assert.equal((await ctx.inject("GET", "/api/timesheet?from=2026-10-01&to=2026-10-07&employeeId=1", { cookie })).status, 400)
    const save = await ctx.inject("PUT", "/api/timesheet/week", { cookie, json: { from: "2026-10-05", to: "2026-10-11", entries: [] } })
    assert.equal(save.status, 400)
    assert.equal(save.body.error.code, "NO_EMPLOYEE_RECORD")
  })
})
