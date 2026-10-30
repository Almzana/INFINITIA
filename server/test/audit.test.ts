import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, createUser, nextIp, removeEmployees, setup, type TempUser } from "./helpers.ts"

let ctx: Ctx
let user: TempUser

before(async () => {
  ctx = await setup()
  user = await createUser(ctx, { salary: 30000 })
})
after(async () => {
  await removeEmployees(ctx, [user.employeeId])
  await ctx.close()
})

describe("audit trail", () => {
  test("a salary change is recorded with before and after", async () => {
    const admin = await ctx.as("admin")
    const res = await ctx.inject("PATCH", `/api/employees/${user.employeeId}`, { cookie: admin, json: { salary: 35000 } })
    assert.equal(res.status, 200)
    const trail = await ctx.inject("GET", `/api/audit?entity=employee&action=employee.updated&q=${user.employeeId}`, { cookie: admin })
    assert.equal(trail.status, 200)
    const entry = trail.body.data.find((e: { entityId: string }) => e.entityId === user.employeeId)
    assert.ok(entry, "audit entry for the update")
    assert.deepEqual(entry.details.changes.salary, [30000, 35000])
    assert.equal(entry.actorName.length > 0, true)
    assert.equal(trail.body.meta.page, 1)
  })

  test("passwords and tokens never reach the audit log", async () => {
    const newPassword = `Secret-${user.username}-x9`.replace(user.username, "zz")
    const res = await ctx.inject("PUT", "/api/auth/password", {
      cookie: user.cookie,
      json: { currentPassword: user.password, newPassword },
      headers: { "x-forwarded-for": nextIp() },
    })
    assert.equal(res.status, 204)
    await ctx.inject("PUT", `/api/employees/${user.employeeId}/account`, { cookie: await ctx.as("admin"), json: { password: "Admin-set-pass-77" } })
    // Failed logins record the login name only
    await ctx.inject("POST", "/api/auth/login", { json: { login: user.username, password: "Wrong-typed-pass-5" }, headers: { "x-forwarded-for": nextIp() } })

    const { rows } = await ctx.pool.query<{ t: string }>("SELECT details::text AS t FROM audit_log WHERE at > now() - interval '5 minutes'")
    const all = rows.map((r) => r.t).join("\n")
    for (const secret of [user.password, newPassword, "Admin-set-pass-77", "Wrong-typed-pass-5"]) {
      assert.ok(!all.includes(secret), `audit log contains a password`)
    }
    assert.doesNotMatch(all, /"(password|passwordHash|token|hash)"/i)
    const actions = await ctx.pool.query("SELECT action FROM audit_log WHERE entity_id = $1 OR entity_id = $2", [user.userId, user.employeeId])
    const names = actions.rows.map((r: { action: string }) => r.action)
    assert.ok(names.includes("password.changed"))
    assert.ok(names.includes("account.password_set"))
  })

  test("audit() scrubs secret keys whatever a caller passes", async () => {
    const { audit, initAudit } = await import("../src/audit/audit.ts")
    initAudit(ctx.pool)
    await audit(null, { action: "test.scrub", entity: "test", entityId: user.employeeId, details: { password: "p", resetToken: "t", note: "kept" } })
    const { rows } = await ctx.pool.query("SELECT details FROM audit_log WHERE action = 'test.scrub' AND entity_id = $1", [user.employeeId])
    assert.deepEqual(rows.at(-1).details, { note: "kept" })
    await ctx.pool.query("DELETE FROM audit_log WHERE action = 'test.scrub'")
  })

  test("HR and staff get 403 on /audit", async () => {
    assert.equal((await ctx.inject("GET", "/api/audit", { cookie: await ctx.as("hr") })).status, 403)
    assert.equal((await ctx.inject("GET", "/api/audit", { cookie: await ctx.as("staff") })).status, 403)
  })
})
