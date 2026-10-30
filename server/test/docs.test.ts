import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, setup } from "./helpers.ts"

let ctx: Ctx
before(async () => {
  ctx = await setup()
})
after(() => ctx.close())

describe("API docs", () => {
  test("the OpenAPI document lists every route with a tag, a summary and the cookie requirement", async () => {
    const res = await ctx.inject("GET", "/api/docs/json")
    assert.equal(res.status, 200)
    assert.match(res.body.openapi, /^3\./)
    const ops = Object.entries(res.body.paths as Record<string, Record<string, { tags?: string[]; summary?: string; security?: unknown[] }>>).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, op]) => ({ key: `${method} ${path}`, ...op })),
    )
    assert.ok(ops.length >= 40, `only ${ops.length} operations`)
    for (const op of ops) {
      assert.ok(op.tags?.length, `${op.key} has no tag`)
      assert.ok(op.summary, `${op.key} has no summary`)
    }
    const find = (key: string) => ops.find((o) => o.key === key)
    assert.deepEqual(find("post /api/auth/login")?.security, undefined)
    assert.deepEqual(find("get /api/leaves")?.security, [{ sessionCookie: [] }])
  })

  test("Swagger UI is served", async () => {
    const res = await ctx.inject("GET", "/api/docs/")
    assert.equal(res.status, 200)
    assert.match(res.raw, /swagger/i)
  })
})
