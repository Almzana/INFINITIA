import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
let staffEmp: string
let projectId: string
let wasMember: boolean
const WEEK = { from: "2033-06-06", to: "2033-06-12" }

before(async () => {
  ctx = await setup()
  staffEmp = (await ctx.employeeIdOf("staff"))!
  projectId = (await ctx.pool.query("SELECT id FROM projects ORDER BY id LIMIT 1")).rows[0].id
  wasMember = !!(await ctx.pool.query("SELECT 1 FROM project_members WHERE project_id = $1 AND employee_id = $2", [projectId, staffEmp])).rowCount
  await ctx.pool.query("DELETE FROM project_members WHERE project_id = $1 AND employee_id = $2", [projectId, staffEmp])
})
after(async () => {
  await ctx.pool.query("DELETE FROM time_entries WHERE employee_id = $1 AND date BETWEEN $2 AND $3", [staffEmp, WEEK.from, WEEK.to])
  await ctx.pool.query("DELETE FROM project_members WHERE project_id = $1 AND employee_id = $2", [projectId, staffEmp])
  if (wasMember) await ctx.pool.query("INSERT INTO project_members (project_id, employee_id) VALUES ($1, $2)", [projectId, staffEmp])
  await ctx.close()
})

const logHours = async () =>
  ctx.inject("PUT", "/api/timesheet/week", {
    cookie: await ctx.as("staff"),
    json: { ...WEEK, entries: [{ projectId, phase: "concept", date: "2033-06-07", hours: 2 }] },
  })

describe("project members and the timesheet", () => {
  test("hours only on projects you are a member of", async () => {
    const refused = await logHours()
    assert.equal(refused.status, 400)
    assert.equal(refused.body.error.code, "NOT_PROJECT_MEMBER")
  })

  test("only executives (or the creating Leader) manage members", async () => {
    const path = `/api/projects/${projectId}/members/${staffEmp}`
    assert.equal((await ctx.inject("PUT", path, { cookie: await ctx.as("staff") })).status, 403)
    const added = await ctx.inject("PUT", path, { cookie: await ctx.as("admin") })
    assert.equal(added.status, 200)
    assert.ok(added.body.memberIds.includes(staffEmp))
    assert.equal((await ctx.inject("PUT", `/api/projects/${projectId}/members/NOPE-404`, { cookie: await ctx.as("admin") })).status, 404)
  })

  test("after being added, the hours are accepted", async () => {
    assert.equal((await logHours()).status, 200)
  })
})
