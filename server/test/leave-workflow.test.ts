import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
let staffEmp: string
let hrEmp: string
let hrManagerBefore: string | null

const clear = async () => {
  await ctx.pool.query("DELETE FROM leave_requests WHERE reason LIKE 'TEST wf%'")
  await ctx.pool.query("DELETE FROM leave_quotas WHERE year IN (2033, 2034)")
  await ctx.pool.query("DELETE FROM holidays WHERE date IN ('2033-03-08', '2033-05-10', '2033-05-12')")
  await ctx.pool.query("DELETE FROM notifications")
}

before(async () => {
  ctx = await setup()
  await clear()
  staffEmp = (await ctx.employeeIdOf("staff"))!
  hrEmp = (await ctx.employeeIdOf("hr"))!
  // Make staff the Leader of HR for these tests (restored afterwards)
  hrManagerBefore = (await ctx.pool.query("SELECT manager_id AS m FROM employees WHERE id = $1", [hrEmp])).rows[0].m
  await ctx.pool.query("UPDATE employees SET manager_id = $2 WHERE id = $1", [hrEmp, staffEmp])
})
after(async () => {
  await ctx.pool.query("UPDATE employees SET manager_id = $2 WHERE id = $1", [hrEmp, hrManagerBefore])
  await clear()
  await ctx.close()
})

const file = (cookie: string, from: string, to: string, type = "vacation") =>
  ctx.inject("POST", "/api/leaves", { cookie, json: { type, from, to, reason: "TEST wf leave" } })
const decide = (cookie: string, id: string, status: "approved" | "rejected") =>
  ctx.inject("PUT", "/api/leaves/status", { cookie, json: { ids: [id], status } })
const types = async (who: "staff" | "hr" | "admin") =>
  (await ctx.inject("GET", "/api/notifications", { cookie: await ctx.as(who) })).body.data.map((n: { type: string }) => n.type)

describe("Leader → HR approval", () => {
  test("a request waits for the Leader, is forwarded to HR, and only then can be approved", async () => {
    const hr = await ctx.as("hr")
    const staff = await ctx.as("staff")
    const created = await file(hr, "2033-02-07", "2033-02-08")
    assert.equal(created.status, 201)
    assert.equal(created.body.stage, "leader")
    assert.equal(created.body.approverEmployeeId, staffEmp)
    assert.ok((await types("staff")).includes("leave.requested"), "the Leader is told")

    const inLeaderList = (await ctx.inject("GET", "/api/leaves?pageSize=500", { cookie: staff })).body.data.find((l: { id: string }) => l.id === created.body.id)
    assert.equal(inLeaderList.canDecide, true)

    const forwarded = await decide(staff, created.body.id, "approved")
    assert.equal(forwarded.body.data[0].status, "pending")
    assert.equal(forwarded.body.data[0].stage, "hr")
    assert.ok((await types("hr")).includes("leave.forwarded"), "the requester is told it moved on")
    assert.equal((await decide(staff, created.body.id, "approved")).body.skipped, 1, "the Leader cannot decide the HR stage")

    const final = await decide(await ctx.as("admin"), created.body.id, "approved")
    assert.equal(final.body.data[0].status, "approved")
    assert.equal(final.body.data[0].stage, null)
  })

  test("a Leader's rejection is final", async () => {
    const created = await file(await ctx.as("hr"), "2033-02-14", "2033-02-14")
    const res = await decide(await ctx.as("staff"), created.body.id, "rejected")
    assert.equal(res.body.data[0].status, "rejected")
    assert.ok((await types("hr")).includes("leave.rejected"))
  })
})

describe("quotas and holidays", () => {
  test("holidays are not working days; only HR / executives edit the calendar", async () => {
    assert.equal((await ctx.inject("POST", "/api/holidays", { cookie: await ctx.as("staff"), json: { date: "2033-03-08", name: "Test" } })).status, 403)
    assert.equal((await ctx.inject("POST", "/api/holidays", { cookie: await ctx.as("hr"), json: { date: "2033-03-08", name: "<b>Test day</b>" } })).status, 201)
    const list = await ctx.inject("GET", "/api/holidays?year=2033", { cookie: await ctx.as("staff") })
    assert.ok(list.body.data.some((h: { date: string }) => h.date === "2033-03-08"))
    // Mon 7 – Wed 9 March 2033 with Tuesday off = 2 working days
    const res = await file(await ctx.as("staff"), "2033-03-07", "2033-03-09")
    assert.equal(res.body.days, 2)
  })

  test("adding or removing a holiday recounts the requests that cover it", async () => {
    const hr = await ctx.as("hr")
    // Mon 9 – Wed 11 May 2033 = 3 working days
    const created = await file(await ctx.as("staff"), "2033-05-09", "2033-05-11")
    assert.equal(created.body.days, 3)
    const daysOf = async () => (await ctx.pool.query("SELECT days FROM leave_requests WHERE id = $1", [created.body.id])).rows[0].days
    await ctx.inject("POST", "/api/holidays", { cookie: hr, json: { date: "2033-05-10", name: "Test day" } })
    assert.equal(await daysOf(), 2)
    await ctx.inject("POST", "/api/holidays", { cookie: hr, json: { date: "2033-05-10", name: "Renamed" } })
    assert.equal(await daysOf(), 2, "renaming does not count twice")
    assert.equal((await ctx.inject("DELETE", "/api/holidays/2033-05-10", { cookie: hr })).status, 204)
    assert.equal(await daysOf(), 3)
    // A one-day request on a day that becomes a holiday and back again stays at 1 day (no drift)
    const single = await file(await ctx.as("staff"), "2033-05-12", "2033-05-12")
    const singleDays = async () => (await ctx.pool.query("SELECT days FROM leave_requests WHERE id = $1", [single.body.id])).rows[0].days
    await ctx.inject("POST", "/api/holidays", { cookie: hr, json: { date: "2033-05-12", name: "Oops" } })
    assert.equal(await singleDays(), 1)
    await ctx.inject("DELETE", "/api/holidays/2033-05-12", { cookie: hr })
    assert.equal(await singleDays(), 1)
  })

  test("an enforced quota refuses requests beyond it; pending days count as taken", async () => {
    const hr = await ctx.as("hr")
    const staff = await ctx.as("staff")
    const set = await ctx.inject("PUT", `/api/leaves/quotas/${staffEmp}`, { cookie: hr, json: { year: 2033, type: "personal", days: 2 } })
    assert.equal(set.status, 200)
    const over = await file(staff, "2033-03-14", "2033-03-16", "personal")
    assert.equal(over.status, 409)
    assert.equal(over.body.error.code, "LEAVE_QUOTA_EXCEEDED")
    assert.equal((await file(staff, "2033-03-14", "2033-03-15", "personal")).status, 201)
    const bal = await ctx.inject("GET", "/api/leaves/balance?year=2033", { cookie: staff })
    const personal = bal.body.data.find((b: { type: string }) => b.type === "personal")
    assert.deepEqual({ quota: personal.quota, pending: personal.pending, remaining: personal.remaining }, { quota: 2, pending: 2, remaining: 0 })
    assert.equal((await file(staff, "2033-03-21", "2033-03-21", "personal")).status, 409)
  })

  test("sick leave beyond the quota is allowed (only flagged)", async () => {
    // Mon 2 Jan – Fri 24 Feb 2034 = 40 working days > 30
    const res = await file(await ctx.as("staff"), "2034-01-02", "2034-02-24", "sick")
    assert.equal(res.status, 201)
    const bal = await ctx.inject("GET", "/api/leaves/balance?year=2034", { cookie: await ctx.as("staff") })
    assert.ok(bal.body.data.find((b: { type: string }) => b.type === "sick").remaining < 0)
  })

  test("balances: own, a Leader's report, or HR — nobody else's", async () => {
    assert.equal((await ctx.inject("GET", `/api/leaves/balance?employeeId=${hrEmp}`, { cookie: await ctx.as("staff") })).status, 200, "Leader of HR here")
    assert.equal((await ctx.inject("GET", `/api/leaves/balance?employeeId=${staffEmp}`, { cookie: await ctx.as("dev") })).status, 403)
    assert.equal((await ctx.inject("GET", `/api/leaves/balance?employeeId=${staffEmp}`, { cookie: await ctx.as("hr") })).status, 200)
    assert.equal((await ctx.inject("PUT", "/api/leaves/policy/vacation", { cookie: await ctx.as("staff"), json: { daysPerYear: 99, enforce: true } })).status, 403)
  })
})

describe("approval edge cases", () => {
  let staffManagerBefore: string | null
  before(async () => {
    // HR leads staff here (and staff leads HR from the outer setup): HR is a Leader *and* the HR approver
    staffManagerBefore = (await ctx.pool.query("SELECT manager_id AS m FROM employees WHERE id = $1", [staffEmp])).rows[0].m
    await ctx.pool.query("UPDATE employees SET manager_id = NULL WHERE id = $1", [hrEmp])
    await ctx.pool.query("UPDATE employees SET manager_id = $2 WHERE id = $1", [staffEmp, hrEmp])
  })
  after(async () => {
    await ctx.pool.query("UPDATE employees SET manager_id = $2 WHERE id = $1", [staffEmp, staffManagerBefore])
    await ctx.pool.query("UPDATE employees SET manager_id = $2 WHERE id = $1", [hrEmp, staffEmp])
  })

  test("an HR Leader cannot approve both steps alone", async () => {
    const hr = await ctx.as("hr")
    const created = await file(await ctx.as("staff"), "2033-04-04", "2033-04-04")
    assert.equal(created.body.approverEmployeeId, hrEmp)
    assert.equal((await decide(hr, created.body.id, "approved")).body.data[0].stage, "hr", "forwarded")
    assert.equal((await decide(hr, created.body.id, "approved")).body.skipped, 1, "the same person cannot also approve as HR")
    assert.equal((await decide(await ctx.as("admin"), created.body.id, "approved")).body.data[0].status, "approved")
  })

  test("HR can decide a request whose Leader can no longer act", async () => {
    const created = await file(await ctx.as("staff"), "2033-04-11", "2033-04-11")
    // The Leader's record was removed (approver set to NULL by the foreign key)
    await ctx.pool.query("UPDATE leave_requests SET approver_employee_id = NULL WHERE id = $1", [created.body.id])
    const res = await decide(await ctx.as("hr"), created.body.id, "approved")
    assert.equal(res.body.data[0].status, "approved", "final, not forwarded to themselves")
  })

  test("a request may not cross New Year (quotas are per year)", async () => {
    const res = await file(await ctx.as("staff"), "2033-12-29", "2034-01-04")
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, "LEAVE_CROSSES_YEAR")
  })
})
