import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
const clear = () => ctx.pool.query("DELETE FROM leave_requests WHERE reason LIKE 'TEST %'")

before(async () => {
  ctx = await setup()
  await clear()
})
after(async () => {
  await clear()
  await ctx.close()
})

const request = async (cookie: string, from: string, to: string, type = "vacation") =>
  ctx.inject("POST", "/api/leaves", { cookie, json: { type, from, to, reason: "TEST leave" } })

describe("leave", () => {
  test("working days exclude weekends (Fri 7 – Mon 10 Mar 2031 = 2 days)", async () => {
    const res = await request(await ctx.as("staff"), "2031-03-07", "2031-03-10")
    assert.equal(res.status, 201)
    assert.equal(res.body.days, 2)
    assert.equal(res.body.status, "pending")
  })

  test("weekend-only and reversed ranges are rejected", async () => {
    const staff = await ctx.as("staff")
    assert.equal((await request(staff, "2031-03-08", "2031-03-09")).status, 400)
    assert.equal((await request(staff, "2031-03-20", "2031-03-18")).status, 400)
  })

  test("overlapping requests of the same person are 409", async () => {
    const staff = await ctx.as("staff")
    const first = await request(staff, "2031-04-01", "2031-04-03")
    assert.equal(first.status, 201)
    const clash = await request(staff, "2031-04-03", "2031-04-07", "sick")
    assert.equal(clash.status, 409)
    assert.equal(clash.body.error.code, "LEAVE_OVERLAP")
    // Another person may take the same days
    assert.equal((await request(await ctx.as("hr"), "2031-04-01", "2031-04-03")).status, 201)
  })

  test("a rejected request no longer blocks the dates", async () => {
    const staff = await ctx.as("staff")
    const first = await request(staff, "2031-05-05", "2031-05-06")
    const rej = await ctx.inject("PUT", "/api/leaves/status", { cookie: await ctx.as("hr"), json: { ids: [first.body.id], status: "rejected" } })
    assert.equal(rej.body.data.length, 1)
    assert.equal((await request(staff, "2031-05-05", "2031-05-06")).status, 201)
  })

  test("an approver cannot approve their own request", async () => {
    const hr = await ctx.as("hr")
    const own = await request(hr, "2031-06-02", "2031-06-03")
    assert.equal(own.status, 201)
    const self = await ctx.inject("PUT", "/api/leaves/status", { cookie: hr, json: { ids: [own.body.id], status: "approved" } })
    assert.equal(self.status, 200)
    assert.equal(self.body.data.length, 0)
    assert.equal(self.body.skipped, 1)

    const exec = await ctx.inject("PUT", "/api/leaves/status", { cookie: await ctx.as("admin"), json: { ids: [own.body.id], status: "approved" } })
    assert.equal(exec.body.data[0].status, "approved")
    // Already decided: not decided again
    const again = await ctx.inject("PUT", "/api/leaves/status", { cookie: await ctx.as("admin"), json: { ids: [own.body.id], status: "rejected" } })
    assert.equal(again.body.skipped, 1)
  })

  test("staff who lead nobody cannot decide; staff only see their own requests and their team's", async () => {
    const staff = await ctx.as("staff")
    const own = await request(staff, "2031-07-01", "2031-07-01")
    // The dev account is staff without a team
    assert.equal((await ctx.inject("PUT", "/api/leaves/status", { cookie: await ctx.as("dev"), json: { ids: [own.body.id], status: "approved" } })).status, 403)
    // staff leads a team, so may call the endpoint, but never decides their own request
    const self = await ctx.inject("PUT", "/api/leaves/status", { cookie: staff, json: { ids: [own.body.id], status: "approved" } })
    assert.equal(self.body.skipped, 1)
    const list = await ctx.inject("GET", "/api/leaves?pageSize=500", { cookie: staff })
    const me = await ctx.employeeIdOf("staff")
    assert.ok(list.body.data.length > 0)
    assert.ok(list.body.data.every((l: { employeeId: string; approverEmployeeId: string | null }) => l.employeeId === me || l.approverEmployeeId === me))
    const all = await ctx.inject("GET", "/api/leaves?pageSize=500", { cookie: await ctx.as("hr") })
    assert.ok(all.body.data.some((l: { employeeId: string }) => l.employeeId !== me))
  })
})
