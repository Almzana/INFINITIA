import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, nextIp, removeEmployees, setup, TEST_PASSWORD, unique } from "./helpers.ts"

let ctx: Ctx
const created: string[] = []

before(async () => {
  ctx = await setup()
})
after(async () => {
  await removeEmployees(ctx, created)
  await ctx.close()
})

const loginRaw = (login: string, password: string) =>
  ctx.inject("POST", "/api/auth/login", { json: { login, password }, headers: { "x-forwarded-for": nextIp() } })

describe("login / session", () => {
  test("signs in by username", async () => {
    const res = await loginRaw("staff", TEST_PASSWORD)
    assert.equal(res.status, 200)
    assert.equal(res.body.user.username, "staff")
    assert.equal(res.body.user.role, "staff")
    assert.equal(res.body.user.passwordHash, undefined)
    const cookie = String(res.headers["set-cookie"])
    assert.match(cookie, /sid=/)
    assert.match(cookie, /HttpOnly/i)
  })

  test("signs in by email (case-insensitive)", async () => {
    const res = await loginRaw("  HR@infini-ia.com ", TEST_PASSWORD)
    assert.equal(res.status, 200)
    assert.equal(res.body.user.role, "hr")
  })

  test("wrong password is 401 INVALID_CREDENTIALS", async () => {
    const res = await loginRaw("admin", "not-the-password-1")
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, "INVALID_CREDENTIALS")
  })

  test("unknown account gets the same 401", async () => {
    const res = await loginRaw(`nobody-${unique()}`, "whatever-123")
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, "INVALID_CREDENTIALS")
  })

  test("/auth/me needs a session and returns the user", async () => {
    assert.equal((await ctx.inject("GET", "/api/auth/me")).status, 401)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: "sid=bogus" })).status, 401)
    const me = await ctx.inject("GET", "/api/auth/me", { cookie: await ctx.as("admin") })
    assert.equal(me.status, 200)
    assert.equal(me.body.user.username, "admin")
    assert.equal(me.body.user.role, "executive")
    assert.equal(me.body.user.mustChangePassword, false)
  })

  test("logout invalidates the session", async () => {
    const cookie = await ctx.login("staff")
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie })).status, 200)
    const out = await ctx.inject("POST", "/api/auth/logout", { cookie })
    assert.equal(out.status, 204)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie })).status, 401)
  })

  test("locks an account name after 5 failures (429 ACCOUNT_LOCKED)", async () => {
    const login = `ghost-${unique()}`
    for (let i = 0; i < 5; i++) assert.equal((await loginRaw(login, "wrong-pass-1")).status, 401)
    const res = await loginRaw(login, "wrong-pass-1")
    assert.equal(res.status, 429)
    assert.equal(res.body.error.code, "ACCOUNT_LOCKED")
    assert.ok(Number(res.headers["retry-after"]) > 0)
  })

  test("non-JSON login body is rejected", async () => {
    const res = await ctx.inject("POST", "/api/auth/login", {
      payload: "login=admin",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": nextIp() },
    })
    assert.ok(res.status === 400 || res.status === 415, `got ${res.status}`)
  })
})

describe("forced password change", () => {
  test("HR-created account must set a password before using the app", async () => {
    const u = unique()
    const username = `fc${u}`.toLowerCase()
    const temp = `Temp-${u}-42`
    const createdRes = await ctx.inject("POST", "/api/employees", {
      cookie: await ctx.as("hr"),
      json: {
        code: `F${u}`.toUpperCase(),
        firstName: "Force",
        lastName: "Change",
        email: `${username}@test.invalid`,
        department: "Test Dept",
        position: "Tester",
        startDate: "2024-01-01",
        account: { username, password: temp },
      },
    })
    assert.equal(createdRes.status, 201)
    created.push(createdRes.body.id)

    const cookie = await ctx.login(username, temp)
    const me = await ctx.inject("GET", "/api/auth/me", { cookie })
    assert.equal(me.body.user.mustChangePassword, true)

    const blocked = await ctx.inject("GET", "/api/tasks", { cookie })
    assert.equal(blocked.status, 403)
    assert.equal(blocked.body.error.code, "PASSWORD_CHANGE_REQUIRED")
    assert.equal((await ctx.inject("GET", "/api/employees", { cookie })).body.error.code, "PASSWORD_CHANGE_REQUIRED")

    const change = (currentPassword: string, newPassword: string) =>
      ctx.inject("PUT", "/api/auth/password", { cookie, json: { currentPassword, newPassword }, headers: { "x-forwarded-for": nextIp() } })

    const wrong = await change("not-my-pass-1", "Brand-new-pass-1")
    assert.equal(wrong.status, 400)
    assert.equal(wrong.body.error.code, "WRONG_PASSWORD")

    const short = await change(temp, "a1")
    assert.equal(short.status, 400)
    assert.equal(short.body.error.code, "VALIDATION_ERROR")

    for (const [pw, code] of [
      ["onlyletters", "letters_digits"],
      ["1234567890", "letters_digits"],
      [`x${username}9`, "personal"],
      [temp, "same"],
    ] as const) {
      const res = await change(temp, pw)
      assert.equal(res.status, 400, pw)
      assert.equal(res.body.error.code, "WEAK_PASSWORD")
      assert.equal(res.body.error.details[0].message, code)
    }

    const ok = await change(temp, `Mine-${u}-77`)
    assert.equal(ok.status, 204)
    assert.equal((await ctx.inject("GET", "/api/tasks", { cookie })).status, 200)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie })).body.user.mustChangePassword, false)
    // Old password no longer works, new one does
    assert.equal((await loginRaw(username, temp)).status, 401)
    assert.equal((await loginRaw(username, `Mine-${u}-77`)).status, 200)

    // HR setting a new password signs the person out and requires a change again
    const reset = await ctx.inject("PUT", `/api/employees/${createdRes.body.id}/account`, {
      cookie: await ctx.as("hr"),
      json: { password: `Again-${u}-11` },
    })
    assert.equal(reset.status, 200)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie })).status, 401)
    const again = await ctx.login(username, `Again-${u}-11`)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: again })).body.user.mustChangePassword, true)
  })
})

describe("password reset", () => {
  test("/auth/forgot answers 204 for known and unknown accounts", async () => {
    for (const login of ["staff@infini-ia.com", `nobody-${unique()}@test.invalid`]) {
      const res = await ctx.inject("POST", "/api/auth/forgot", { json: { login }, headers: { "x-forwarded-for": nextIp() } })
      assert.equal(res.status, 204)
    }
  })

  test("a bogus token is 400 INVALID_TOKEN", async () => {
    const res = await ctx.inject("POST", "/api/auth/reset", {
      json: { token: "x".repeat(43), newPassword: "Good-pass-123" },
      headers: { "x-forwarded-for": nextIp() },
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, "INVALID_TOKEN")
  })

  test("a weak new password is refused before the token is used", async () => {
    const res = await ctx.inject("POST", "/api/auth/reset", {
      json: { token: "y".repeat(43), newPassword: "lettersonly" },
      headers: { "x-forwarded-for": nextIp() },
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, "WEAK_PASSWORD")
  })

  test("repository token: single use, signs out, newest link wins", async () => {
    const { createAuthRepository } = await import("../src/auth/repository.ts")
    const { hashPassword } = await import("../src/auth/password.ts")
    const repo = createAuthRepository(ctx.pool)
    const u = unique()
    const username = `rs${u}`.toLowerCase()
    const res = await ctx.inject("POST", "/api/employees", {
      cookie: await ctx.as("admin"),
      json: {
        code: `R${u}`.toUpperCase(),
        firstName: "Reset",
        lastName: "Me",
        email: `${username}@test.invalid`,
        department: "Test Dept",
        position: "Tester",
        startDate: "2024-01-01",
        account: { username, password: `First-${u}-1` },
      },
    })
    assert.equal(res.status, 201)
    created.push(res.body.id)
    const { rows } = await ctx.pool.query<{ user_id: string }>("SELECT user_id FROM employees WHERE id = $1", [res.body.id])
    const userId = rows[0].user_id
    const session = await ctx.login(username, `First-${u}-1`)

    const older = await repo.createResetToken(userId, 60_000)
    const token = await repo.createResetToken(userId, 60_000)
    // Only the hash is stored
    const stored = await ctx.pool.query("SELECT token_hash FROM password_resets WHERE user_id = $1", [userId])
    assert.equal(stored.rowCount, 1)
    assert.notEqual(stored.rows[0].token_hash, token)

    assert.equal(await repo.resetWithToken(older, await hashPassword("Unused-pass-1")), null)

    // Through the API: consumes the token, clears must-change, ends all sessions
    const ok = await ctx.inject("POST", "/api/auth/reset", { json: { token, newPassword: `Reset-${u}-9` }, headers: { "x-forwarded-for": nextIp() } })
    assert.equal(ok.status, 204)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: session })).status, 401)
    const fresh = await ctx.login(username, `Reset-${u}-9`)
    assert.equal((await ctx.inject("GET", "/api/auth/me", { cookie: fresh })).body.user.mustChangePassword, false)

    const reuse = await ctx.inject("POST", "/api/auth/reset", { json: { token, newPassword: "Another-pass-2" }, headers: { "x-forwarded-for": nextIp() } })
    assert.equal(reuse.body.error.code, "INVALID_TOKEN")

    // Expired tokens do not work either
    const expired = await repo.createResetToken(userId, -1000)
    assert.equal(await repo.resetWithToken(expired, await hashPassword("Expired-pass-3")), null)
    // A valid one does, directly via the repository
    const direct = await repo.createResetToken(userId, 60_000)
    assert.equal(await repo.resetWithToken(direct, await hashPassword("Direct-pass-4")), userId)
  })
})

describe("own profile", () => {
  test("staff can change nickname/phone only", async () => {
    const cookie = await ctx.as("staff")
    const before = await ctx.pool.query("SELECT nickname, phone FROM employees WHERE id = $1", [await ctx.employeeIdOf("staff")])
    try {
      const ok = await ctx.inject("PATCH", "/api/auth/profile", { cookie, json: { nickname: "<b>Tee</b>", phone: "081-000-0000" } })
      assert.equal(ok.status, 200)
      assert.equal(ok.body.nickname, "Tee")
      // Unknown fields such as salary are stripped by the schema, never written
      const salaryBefore = await ctx.pool.query("SELECT salary FROM employees WHERE id = $1", [await ctx.employeeIdOf("staff")])
      await ctx.inject("PATCH", "/api/auth/profile", { cookie, json: { nickname: "Tee", salary: 1 } })
      const salaryAfter = await ctx.pool.query("SELECT salary FROM employees WHERE id = $1", [await ctx.employeeIdOf("staff")])
      assert.equal(salaryAfter.rows[0].salary, salaryBefore.rows[0].salary)
      assert.equal((await ctx.inject("PATCH", "/api/auth/profile", { cookie, json: { phone: "<script>" } })).status, 400)
    } finally {
      await ctx.pool.query("UPDATE employees SET nickname = $2, phone = $3 WHERE id = $1", [
        await ctx.employeeIdOf("staff"),
        before.rows[0].nickname,
        before.rows[0].phone,
      ])
    }
  })
})
