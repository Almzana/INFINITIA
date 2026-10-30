import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
const clear = async () => {
  await ctx.pool.query("DELETE FROM leave_requests WHERE reason LIKE 'TEST notif%'")
  await ctx.pool.query("DELETE FROM tasks WHERE title = 'TEST notif task'")
  await ctx.pool.query("DELETE FROM notifications")
}

before(async () => {
  ctx = await setup()
  await clear()
})
after(async () => {
  await clear()
  await ctx.close()
})

const list = async (cookie: string) => (await ctx.inject("GET", "/api/notifications", { cookie })).body
const fileLeave = (cookie: string, from: string, to: string) =>
  ctx.inject("POST", "/api/leaves", { cookie, json: { type: "vacation", from, to, reason: "TEST notif leave" } })

describe("notifications", () => {
  test("a leave request reaches approvers, never the requester, with a link to the request", async () => {
    const staff = await ctx.as("staff")
    const created = await fileLeave(staff, "2032-02-02", "2032-02-03")
    assert.equal(created.status, 201)

    const hr = await list(await ctx.as("hr"))
    const n = hr.data.find((x: { type: string }) => x.type === "leave.requested")
    assert.ok(n, "HR got the request")
    assert.equal(n.link, `/leave?view=${created.body.id}`)
    assert.equal(n.read, false)
    assert.equal(n.params.days, 2)
    assert.ok(hr.unread >= 1)
    assert.ok((await list(await ctx.as("admin"))).data.some((x: { type: string }) => x.type === "leave.requested"), "executive got it too")
    assert.equal((await list(staff)).data.filter((x: { type: string }) => x.type === "leave.requested").length, 0)
  })

  test("a bulk decision tells each requester about their own request in one go", async () => {
    const staff = await ctx.as("staff")
    const a = await fileLeave(staff, "2032-03-01", "2032-03-01")
    const b = await fileLeave(staff, "2032-03-08", "2032-03-08")
    const res = await ctx.inject("PUT", "/api/leaves/status", { cookie: await ctx.as("hr"), json: { ids: [a.body.id, b.body.id], status: "approved" } })
    assert.equal(res.body.data.length, 2)
    const mine = (await list(staff)).data.filter((x: { type: string }) => x.type === "leave.approved")
    assert.deepEqual(mine.map((x: { link: string }) => x.link).sort(), [`/leave?view=${a.body.id}`, `/leave?view=${b.body.id}`].sort())
    assert.ok(mine.every((x: { actorName: string | null }) => x.actorName), "the approver is named")
  })

  test("an assigned task reaches the assignee by email", async () => {
    const hrEmp = await ctx.employeeIdOf("hr")
    const res = await ctx.inject("POST", "/api/tasks", { cookie: await ctx.as("admin"), json: { title: "TEST notif task", assigneeEmployeeId: hrEmp } })
    assert.equal(res.status, 201)
    const n = (await list(await ctx.as("hr"))).data.find((x: { type: string }) => x.type === "task.assigned")
    assert.ok(n, "HR got the task notification")
    assert.equal(n.params.title, "TEST notif task")
  })

  test("marking read is scoped to the signed-in user", async () => {
    const hr = await ctx.as("hr")
    const staff = await ctx.as("staff")
    const hrItem = (await list(hr)).data[0]
    // Someone else's id is silently ignored
    const foreign = await ctx.inject("POST", "/api/notifications/read", { cookie: staff, json: { ids: [hrItem.id] } })
    assert.equal(foreign.status, 200)
    assert.equal(foreign.body.updated, 0)
    assert.equal((await list(hr)).data[0].read, false)

    const own = await ctx.inject("POST", "/api/notifications/read", { cookie: hr, json: { ids: [hrItem.id] } })
    assert.equal(own.body.updated, 1)
    assert.equal((await list(hr)).data.find((x: { id: number }) => x.id === hrItem.id).read, true)

    await ctx.inject("POST", "/api/notifications/read", { cookie: hr, json: { all: true } })
    assert.equal((await list(hr)).unread, 0)
  })

  test("bad bodies and anonymous calls are refused", async () => {
    const hr = await ctx.as("hr")
    assert.equal((await ctx.inject("POST", "/api/notifications/read", { cookie: hr, json: {} })).status, 400)
    assert.equal((await ctx.inject("POST", "/api/notifications/read", { cookie: hr, json: { ids: [] } })).status, 400)
    assert.equal((await ctx.inject("POST", "/api/notifications/read", { cookie: hr, json: { ids: [1], all: true } })).status, 400)
    assert.equal((await ctx.inject("GET", "/api/notifications?limit=1000", { cookie: hr })).status, 400)
    assert.equal((await ctx.inject("GET", "/api/notifications")).status, 401)
  })
})
