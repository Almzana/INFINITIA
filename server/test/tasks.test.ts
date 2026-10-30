import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, createUser, removeEmployees, setup } from "./helpers.ts"

let ctx: Ctx
const taskIds: string[] = []
const employees: string[] = []
let reportId: string
let otherId: string

before(async () => {
  ctx = await setup()
  const staffEmp = await ctx.employeeIdOf("staff")
  const { rows } = await ctx.pool.query<{ id: string }>(
    "SELECT id FROM employees WHERE manager_id = $1 AND status <> 'resigned' ORDER BY code",
    [staffEmp],
  )
  assert.ok(rows.length >= 1, "seed should give the staff demo user a team")
  reportId = rows[0].id
  otherId = await ctx.employeeIdOf("hr")
})
after(async () => {
  await ctx.pool.query("DELETE FROM tasks WHERE id = ANY($1)", [taskIds])
  await removeEmployees(ctx, employees)
  await ctx.close()
})

async function createTask(cookie: string, body: Record<string, unknown>) {
  const res = await ctx.inject("POST", "/api/tasks", { cookie, json: body })
  if (res.status === 201) taskIds.push(res.body.id)
  return res
}

describe("task scoping", () => {
  test("users see only their own tasks", async () => {
    const staff = await ctx.as("staff")
    const hr = await ctx.as("hr")
    const mine = await createTask(staff, { title: "  <b>Staff</b> private task ", priority: "high" })
    assert.equal(mine.status, 201)
    assert.equal(mine.body.title, "Staff private task")
    assert.equal(mine.body.assigneeEmail, "staff@infini-ia.com")
    assert.equal(mine.body.assignedByUserId, null)

    const staffList = await ctx.inject("GET", "/api/tasks?pageSize=100", { cookie: staff })
    assert.ok(staffList.body.data.some((t: { id: string }) => t.id === mine.body.id))
    assert.ok(staffList.body.data.every((t: { assigneeEmail: string }) => t.assigneeEmail === "staff@infini-ia.com"))

    const hrList = await ctx.inject("GET", "/api/tasks?pageSize=100", { cookie: hr })
    assert.equal(hrList.status, 200)
    assert.ok(!hrList.body.data.some((t: { id: string }) => t.id === mine.body.id))

    // Someone else's task behaves like a missing one
    assert.equal((await ctx.inject("PATCH", `/api/tasks/${mine.body.id}`, { cookie: hr, json: { status: "done" } })).status, 404)
    assert.equal((await ctx.inject("DELETE", `/api/tasks/${mine.body.id}`, { cookie: hr })).status, 404)
    // ...and HR is not staff's leader, so cannot list their tasks
    assert.equal((await ctx.inject("GET", `/api/tasks?employeeId=${await ctx.employeeIdOf("staff")}`, { cookie: hr })).status, 403)
  })

  test("empty title after sanitizing is rejected", async () => {
    const res = await createTask(await ctx.as("staff"), { title: "<i></i>" })
    assert.equal(res.status, 400)
  })

  test("a leader assigns to their own report but not to others", async () => {
    const staff = await ctx.as("staff")
    const ok = await createTask(staff, { title: "For my report", assigneeEmployeeId: reportId })
    assert.equal(ok.status, 201)
    assert.ok(ok.body.assignedByUserId)
    assert.notEqual(ok.body.assigneeEmail, "staff@infini-ia.com")

    const view = await ctx.inject("GET", `/api/tasks?employeeId=${reportId}`, { cookie: staff })
    assert.equal(view.status, 200)
    assert.ok(view.body.data.some((t: { id: string }) => t.id === ok.body.id))

    const denied = await createTask(staff, { title: "Not my report", assigneeEmployeeId: otherId })
    assert.equal(denied.status, 403)

    // The leader can update and the edit sticks
    const upd = await ctx.inject("PATCH", `/api/tasks/${ok.body.id}`, { cookie: staff, json: { priority: "low" } })
    assert.equal(upd.status, 200)
    assert.equal(upd.body.priority, "low")
  })

  test("an executive may assign to anyone", async () => {
    const res = await createTask(await ctx.as("admin"), { title: "From the top", assigneeEmployeeId: otherId })
    assert.equal(res.status, 201)
    assert.equal(res.body.assigneeEmail, "hr@infini-ia.com")
  })

  test("an assignee cannot delete a task their leader assigned", async () => {
    const lead = await createUser(ctx)
    employees.push(lead.employeeId)
    const member = await createUser(ctx, { managerId: lead.employeeId })
    employees.push(member.employeeId)
    const task = await createTask(lead.cookie, { title: "Assigned work", assigneeEmployeeId: member.employeeId })
    assert.equal(task.status, 201)
    // The member may update status but not delete
    assert.equal((await ctx.inject("PATCH", `/api/tasks/${task.body.id}`, { cookie: member.cookie, json: { status: "done" } })).status, 200)
    assert.equal((await ctx.inject("DELETE", `/api/tasks/${task.body.id}`, { cookie: member.cookie })).status, 404)
  })

  test("an ex-leader loses edit rights over tasks they assigned", async () => {
    const lead = await createUser(ctx)
    employees.push(lead.employeeId)
    const member = await createUser(ctx, { managerId: lead.employeeId })
    employees.push(member.employeeId)
    const task = await createTask(lead.cookie, { title: "Before reorg", assigneeEmployeeId: member.employeeId })
    assert.equal(task.status, 201)
    assert.equal((await ctx.inject("PATCH", `/api/tasks/${task.body.id}`, { cookie: lead.cookie, json: { priority: "high" } })).status, 200)

    const moved = await ctx.inject("PATCH", `/api/employees/${member.employeeId}`, { cookie: await ctx.as("admin"), json: { managerId: null } })
    assert.equal(moved.status, 200)

    assert.equal((await ctx.inject("PATCH", `/api/tasks/${task.body.id}`, { cookie: lead.cookie, json: { priority: "low" } })).status, 404)
    assert.equal((await ctx.inject("DELETE", `/api/tasks/${task.body.id}`, { cookie: lead.cookie })).status, 404)
    assert.equal((await ctx.inject("GET", `/api/tasks?employeeId=${member.employeeId}`, { cookie: lead.cookie })).status, 403)
    // The assignee still owns it
    assert.equal((await ctx.inject("PATCH", `/api/tasks/${task.body.id}`, { cookie: member.cookie, json: { status: "done" } })).status, 200)
  })

  test("/team reports leader status", async () => {
    const staff = await ctx.inject("GET", "/api/team", { cookie: await ctx.as("staff") })
    assert.equal(staff.body.isLeader, true)
    assert.ok(staff.body.members.some((m: { id: string }) => m.id === reportId))
    const hr = await ctx.inject("GET", "/api/team", { cookie: await ctx.as("hr") })
    assert.equal(hr.body.isLeader, false)
  })
})
