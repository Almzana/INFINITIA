import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, createUser, removeEmployees, setup, type TempUser } from "./helpers.ts"

let ctx: Ctx
let projectId: string
let otherLeader: TempUser
let follower: TempUser
let plainStaff: TempUser

const clear = () => ctx.pool.query("DELETE FROM projects WHERE name LIKE 'TEST %'")

before(async () => {
  ctx = await setup()
  await clear()
  otherLeader = await createUser(ctx)
  follower = await createUser(ctx, { managerId: otherLeader.employeeId })
  plainStaff = await createUser(ctx)
  const res = await ctx.inject("POST", "/api/projects", {
    cookie: await ctx.as("staff"),
    json: { name: "TEST House", type: "design-build", value: 1_000_000, cost: 600_000, start: "2031-01-06", end: "2031-12-26", manager: "Tester" },
  })
  assert.equal(res.status, 201, res.raw)
  projectId = res.body.id
})
after(async () => {
  await clear()
  await removeEmployees(ctx, [follower.employeeId, otherLeader.employeeId, plainStaff.employeeId])
  await ctx.close()
})

const project = async () => (await ctx.inject("GET", `/api/projects/${projectId}`, { cookie: await ctx.as("admin") })).body

describe("projects", () => {
  test("a new project gets phases and installments; the first is invoiced", async () => {
    const p = await project()
    assert.ok(p.phases.length > 0)
    assert.ok(p.installments.length > 0)
    assert.equal(p.installments[0].status, "invoiced")
    assert.equal(p.installments.reduce((s: number, i: { amount: number }) => s + i.amount, 0), 1_000_000)
  })

  test("validation: cost must be below value, end after start", async () => {
    const admin = await ctx.as("admin")
    const base = { name: "TEST bad", type: "interior", value: 100, cost: 100, start: "2031-01-06", end: "2031-02-06", manager: "x" }
    assert.equal((await ctx.inject("POST", "/api/projects", { cookie: admin, json: base })).status, 400)
    assert.equal((await ctx.inject("POST", "/api/projects", { cookie: admin, json: { ...base, cost: 1, end: "2031-01-01" } })).status, 400)
  })

  test("staff who lead nobody cannot create projects", async () => {
    const res = await ctx.inject("POST", "/api/projects", {
      cookie: plainStaff.cookie,
      json: { name: "TEST nope", type: "interior", value: 100, cost: 1, start: "2031-01-06", end: "2031-02-06", manager: "x" },
    })
    assert.equal(res.status, 403)
  })

  test("a leader edits only their own project", async () => {
    const phase = (await project()).phases[0].key
    const own = await ctx.inject("PUT", `/api/projects/${projectId}/phases/${phase}`, { cookie: await ctx.as("staff"), json: { progress: 40 } })
    assert.equal(own.status, 200)
    const foreign = await ctx.inject("PUT", `/api/projects/${projectId}/phases/${phase}`, { cookie: otherLeader.cookie, json: { progress: 90 } })
    assert.equal(foreign.status, 403)
    // Imported projects (no creator) belong to executives only
    const imported = (await ctx.pool.query<{ id: string }>("SELECT id FROM projects WHERE created_by_user_id IS NULL ORDER BY id LIMIT 1")).rows[0]
    if (imported) {
      const res = await ctx.inject("POST", `/api/projects/${imported.id}/change-orders`, {
        cookie: await ctx.as("staff"),
        json: { title: "x", amount: 1, requestedBy: "ลูกค้า" },
      })
      assert.equal(res.status, 403)
    }
    // Unknown project id: 404 for a leader
    assert.equal((await ctx.inject("PUT", "/api/projects/ZZ999/phases/concept", { cookie: await ctx.as("staff"), json: { progress: 1 } })).status, 404)
  })

  test("marking an installment paid is executive-only", async () => {
    const inst = (await project()).installments[0]
    const staff = await ctx.inject("PUT", `/api/projects/${projectId}/installments/${inst.id}`, { cookie: await ctx.as("staff"), json: { status: "paid" } })
    assert.equal(staff.status, 403)
    const exec = await ctx.inject("PUT", `/api/projects/${projectId}/installments/${inst.id}`, { cookie: await ctx.as("admin"), json: { status: "paid" } })
    assert.equal(exec.status, 200)
    const paid = exec.body.installments.find((i: { id: string }) => i.id === inst.id)
    assert.equal(paid.status, "paid")
    assert.ok(paid.paidDate)
  })

  test("approving a change order bills it as an invoiced installment", async () => {
    const staff = await ctx.as("staff")
    const add = await ctx.inject("POST", `/api/projects/${projectId}/change-orders`, {
      cookie: staff,
      json: { title: "Extra deck", amount: 50_000, costImpact: 30_000, daysImpact: 7, requestedBy: "ลูกค้า" },
    })
    assert.equal(add.status, 201)
    const co = add.body.changeOrders.at(-1)
    assert.equal(co.status, "pending")

    assert.equal((await ctx.inject("PUT", `/api/projects/${projectId}/change-orders/${co.id}`, { cookie: staff, json: { status: "approved" } })).status, 403)

    const ok = await ctx.inject("PUT", `/api/projects/${projectId}/change-orders/${co.id}`, { cookie: await ctx.as("admin"), json: { status: "approved" } })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.changeOrders.find((c: { id: string }) => c.id === co.id).status, "approved")
    const billed = ok.body.installments.find((i: { changeOrderId: string | null }) => i.changeOrderId === co.id)
    assert.ok(billed, "an installment for the change order")
    assert.equal(billed.status, "invoiced")
    assert.equal(billed.amount, 50_000)

    // Deciding again is a 404 (only pending change orders can be decided)
    const again = await ctx.inject("PUT", `/api/projects/${projectId}/change-orders/${co.id}`, { cookie: await ctx.as("admin"), json: { status: "rejected" } })
    assert.equal(again.status, 404)
  })

  test("a rejected change order creates no installment", async () => {
    const add = await ctx.inject("POST", `/api/projects/${projectId}/change-orders`, {
      cookie: await ctx.as("staff"),
      json: { title: "Skip pool", amount: -20_000, requestedBy: "บริษัท" },
    })
    const co = add.body.changeOrders.at(-1)
    const res = await ctx.inject("PUT", `/api/projects/${projectId}/change-orders/${co.id}`, { cookie: await ctx.as("admin"), json: { status: "rejected" } })
    assert.equal(res.status, 200)
    assert.ok(!res.body.installments.some((i: { changeOrderId: string | null }) => i.changeOrderId === co.id))
  })
})
