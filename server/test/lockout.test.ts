import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup, TEST_PASSWORD } from "./helpers.ts"

// Own file = own process: the in-memory lock does not leak into other test files
let ctx: Ctx
before(async () => {
  ctx = await setup()
})
after(() => ctx.close())

const login = (id: string, password: string) => ctx.inject("POST", "/api/auth/login", { json: { login: id, password } })

describe("per-account lockout", () => {
  test("username and email count as one account", async () => {
    // 5 failures split across both names of the dev account
    for (const id of ["dev", "dev@infini-ia.com", "dev", "DEV@infini-ia.com", "dev"]) assert.equal((await login(id, "wrong-password-1")).status, 401)
    const locked = await login("dev@infini-ia.com", TEST_PASSWORD)
    assert.equal(locked.status, 429, "locked under the email too, even with the right password")
    assert.equal(locked.body.error.code, "ACCOUNT_LOCKED")
  })
})
