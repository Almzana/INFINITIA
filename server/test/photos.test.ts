import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, createUser, PNG, removeEmployees, setup, type TempUser } from "./helpers.ts"

let ctx: Ctx
let user: TempUser
let colleague: TempUser

before(async () => {
  ctx = await setup()
  user = await createUser(ctx)
  colleague = await createUser(ctx)
})
after(async () => {
  await removeEmployees(ctx, [user.employeeId, colleague.employeeId])
  await ctx.close()
})

const put = (cookie: string, id: string, body: Buffer | string, type: string) =>
  ctx.inject("PUT", `/api/employees/${id}/photo`, { cookie, payload: body, headers: { "content-type": type } })

describe("profile photos", () => {
  test("own PNG upload works and can be read back", async () => {
    const res = await put(user.cookie, user.employeeId, PNG, "image/png")
    assert.equal(res.status, 200)
    assert.equal(typeof res.body.photoVersion, "number")
    const get = await ctx.app.inject({ method: "GET", url: `/api/employees/${user.employeeId}/photo`, headers: { cookie: colleague.cookie } })
    assert.equal(get.statusCode, 200)
    assert.equal(get.headers["content-type"], "image/png")
    assert.equal(get.headers["x-content-type-options"], "nosniff")
    assert.deepEqual(get.rawPayload, PNG)
  })

  test("a fake PNG (wrong signature) is 400", async () => {
    const res = await put(user.cookie, user.employeeId, Buffer.from("not really a png at all"), "image/png")
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, "INVALID_IMAGE")
  })

  test("HTML disguised as an image is 400", async () => {
    const res = await put(user.cookie, user.employeeId, "<html><script>alert(1)</script></html>", "image/jpeg")
    assert.equal(res.status, 400)
  })

  test("a real PNG declared as JPEG is 400", async () => {
    assert.equal((await put(user.cookie, user.employeeId, PNG, "image/jpeg")).status, 400)
  })

  test("SVG is 415", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    assert.equal((await put(user.cookie, user.employeeId, svg, "image/svg+xml")).status, 415)
  })

  test("over 2 MB is 413", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)])
    assert.equal((await put(user.cookie, user.employeeId, big, "image/png")).status, 413)
  })

  test("staff cannot change a colleague's photo", async () => {
    assert.equal((await put(user.cookie, colleague.employeeId, PNG, "image/png")).status, 403)
    assert.equal((await ctx.inject("DELETE", `/api/employees/${colleague.employeeId}/photo`, { cookie: user.cookie })).status, 403)
  })

  test("HR may change staff photos but not an executive's", async () => {
    const hr = await ctx.as("hr")
    assert.equal((await put(hr, colleague.employeeId, PNG, "image/png")).status, 200)
    assert.equal((await put(hr, await ctx.employeeIdOf("admin"), PNG, "image/png")).status, 403)
    assert.equal((await ctx.inject("DELETE", `/api/employees/${colleague.employeeId}/photo`, { cookie: hr })).status, 204)
    assert.equal((await ctx.inject("GET", `/api/employees/${colleague.employeeId}/photo`, { cookie: hr })).status, 404)
  })

  test("photos need a session", async () => {
    assert.equal((await ctx.inject("GET", `/api/employees/${user.employeeId}/photo`)).status, 401)
    assert.equal((await put("", user.employeeId, PNG, "image/png")).status, 401)
  })
})
