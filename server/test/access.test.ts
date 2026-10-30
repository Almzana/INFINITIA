import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, createUser, removeEmployees, setup, unique } from "./helpers.ts"

let ctx: Ctx
const created: string[] = []

before(async () => {
  ctx = await setup()
})
after(async () => {
  await removeEmployees(ctx, created)
  await ctx.close()
})

const newEmployee = (role?: string) => {
  const u = unique()
  return {
    code: `A${u}`.toUpperCase(),
    firstName: "Access",
    lastName: u,
    email: `a${u}@test.invalid`,
    department: "Test Dept",
    position: "Tester",
    startDate: "2024-01-01",
    account: { username: `a${u}`.toLowerCase(), password: `Pass-${u}-1`, role },
  }
}

describe("page-level role access", () => {
  test("HR cannot open projects or timesheet", async () => {
    const hr = await ctx.as("hr")
    for (const url of ["/api/projects", "/api/timesheet?from=2026-01-05&to=2026-01-11"]) {
      const res = await ctx.inject("GET", url, { cookie: hr })
      assert.equal(res.status, 403, url)
      assert.equal(res.body.error.code, "FORBIDDEN")
    }
  })

  test("staff and executives can open projects and their timesheet", async () => {
    for (const who of ["staff", "admin"] as const) {
      const cookie = await ctx.as(who)
      assert.equal((await ctx.inject("GET", "/api/projects", { cookie })).status, 200, who)
      assert.equal((await ctx.inject("GET", "/api/timesheet?from=2026-01-05&to=2026-01-11", { cookie })).status, 200, who)
    }
  })

  test("staff cannot read another person's timesheet", async () => {
    const other = await ctx.employeeIdOf("hr")
    const res = await ctx.inject("GET", `/api/timesheet?from=2026-01-05&to=2026-01-11&employeeId=${other}`, { cookie: await ctx.as("staff") })
    assert.equal(res.status, 403)
  })

  test("only executives see the audit trail", async () => {
    assert.equal((await ctx.inject("GET", "/api/audit", { cookie: await ctx.as("hr") })).status, 403)
    assert.equal((await ctx.inject("GET", "/api/audit", { cookie: await ctx.as("staff") })).status, 403)
    assert.equal((await ctx.inject("GET", "/api/audit", { cookie: await ctx.as("admin") })).status, 200)
  })

  test("unauthenticated requests get 401 everywhere", async () => {
    for (const url of ["/api/employees", "/api/tasks", "/api/projects", "/api/leaves", "/api/meetings?from=2026-01-01&to=2026-01-02", "/api/audit", "/api/team"]) {
      assert.equal((await ctx.inject("GET", url)).status, 401, url)
    }
  })
})

describe("employee management", () => {
  test("staff cannot create, edit or delete employees", async () => {
    const staff = await ctx.as("staff")
    const hrEmp = await ctx.employeeIdOf("hr")
    assert.equal((await ctx.inject("POST", "/api/employees", { cookie: staff, json: newEmployee() })).status, 403)
    assert.equal((await ctx.inject("PATCH", `/api/employees/${hrEmp}`, { cookie: staff, json: { position: "x" } })).status, 403)
    assert.equal((await ctx.inject("DELETE", `/api/employees?ids=${hrEmp}`, { cookie: staff })).status, 403)
    assert.equal((await ctx.inject("PUT", `/api/employees/${hrEmp}/account`, { cookie: staff, json: { password: "Hijack-pass-1" } })).status, 403)
  })

  test("staff never sees salary or personal fields; HR does", async () => {
    const staffList = await ctx.inject("GET", "/api/employees?pageSize=500", { cookie: await ctx.as("staff") })
    assert.equal(staffList.status, 200)
    assert.ok(staffList.body.data.length > 50)
    for (const e of staffList.body.data) {
      for (const k of ["salary", "birthDate", "address", "emergencyName", "emergencyPhone", "username", "role"]) {
        assert.equal(k in e, false, `staff saw ${k}`)
      }
    }
    assert.doesNotMatch(staffList.raw, /"salary"/)
    const hrList = await ctx.inject("GET", "/api/employees?pageSize=5", { cookie: await ctx.as("hr") })
    assert.equal(typeof hrList.body.data[0].salary, "number")
  })

  test("HR cannot grant the executive role; an executive can", async () => {
    const res = await ctx.inject("POST", "/api/employees", { cookie: await ctx.as("hr"), json: newEmployee("executive") })
    assert.equal(res.status, 403)
    const ok = await ctx.inject("POST", "/api/employees", { cookie: await ctx.as("admin"), json: newEmployee("executive") })
    assert.equal(ok.status, 201)
    assert.equal(ok.body.role, "executive")
    created.push(ok.body.id)
  })

  test("HR cannot reset an executive's password or delete an executive", async () => {
    const hr = await ctx.as("hr")
    const adminEmp = await ctx.employeeIdOf("admin")
    const reset = await ctx.inject("PUT", `/api/employees/${adminEmp}/account`, { cookie: hr, json: { password: "Takeover-pass-1" } })
    assert.equal(reset.status, 403)
    const del = await ctx.inject("DELETE", `/api/employees?ids=${adminEmp}`, { cookie: hr })
    assert.equal(del.status, 403)
    const edit = await ctx.inject("PATCH", `/api/employees/${adminEmp}`, { cookie: hr, json: { position: "Demoted" } })
    assert.equal(edit.status, 403)
    // admin still signs in normally
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: await ctx.as("admin") })).status, 200)
  })

  test("HR cannot change their own pay, status or reporting line", async () => {
    const hr = await ctx.as("hr")
    const self = await ctx.employeeIdOf("hr")
    for (const patch of [{ salary: 9_999_999 }, { status: "active" }, { position: "CEO" }, { managerId: null }]) {
      const res = await ctx.inject("PATCH", `/api/employees/${self}`, { cookie: hr, json: patch })
      assert.equal(res.status, 403, JSON.stringify(patch))
    }
  })

  test("HR can edit and delete a regular employee; nobody can delete themselves", async () => {
    const hr = await ctx.as("hr")
    const u = await createUser(ctx)
    created.push(u.employeeId)
    const edit = await ctx.inject("PATCH", `/api/employees/${u.employeeId}`, { cookie: hr, json: { salary: 45000, position: " Lead <i>Tester</i> " } })
    assert.equal(edit.status, 200)
    assert.equal(edit.body.salary, 45000)
    assert.equal(edit.body.position, "Lead Tester")

    const self = await ctx.inject("DELETE", `/api/employees?ids=${await ctx.employeeIdOf("hr")}`, { cookie: hr })
    assert.equal(self.status, 400)
    assert.equal(self.body.error.code, "CANNOT_DELETE_SELF")

    const del = await ctx.inject("DELETE", `/api/employees?ids=${u.employeeId}`, { cookie: hr })
    assert.equal(del.status, 200)
    assert.equal(del.body.deleted, 1)
    // The deleted person's session stops working
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: u.cookie })).status, 401)
  })

  test("duplicate username/email is a 409 naming the field", async () => {
    const body = newEmployee()
    const first = await ctx.inject("POST", "/api/employees", { cookie: await ctx.as("admin"), json: body })
    assert.equal(first.status, 201)
    created.push(first.body.id)
    const dup = await ctx.inject("POST", "/api/employees", { cookie: await ctx.as("admin"), json: { ...body, code: `${body.code}X`.slice(0, 20) } })
    assert.equal(dup.status, 409)
    assert.equal(dup.body.error.code, "CONFLICT")
  })

  test("resigning ends the person's sessions and blocks login", async () => {
    const u = await createUser(ctx)
    created.push(u.employeeId)
    const res = await ctx.inject("PATCH", `/api/employees/${u.employeeId}`, { cookie: await ctx.as("hr"), json: { status: "resigned" } })
    assert.equal(res.status, 200)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: u.cookie })).status, 401)
    await assert.rejects(ctx.login(u.username, u.password), /401/)
  })

  test("error responses never leak stack traces", async () => {
    const res = await ctx.inject("PATCH", "/api/employees/does-not-exist", { cookie: await ctx.as("admin"), json: { position: "x" } })
    assert.equal(res.status, 404)
    assert.doesNotMatch(res.raw, /at .*\.ts:\d+/)
    assert.deepEqual(Object.keys(res.body), ["error"])
  })
})
