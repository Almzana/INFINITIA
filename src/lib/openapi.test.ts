import { describe, expect, it } from "vitest"
import { verdictOf } from "@/lib/dev-api"
import { buildUrl, isAutoCheckable, parseSpec, sampleValue } from "@/lib/openapi"

const spec = {
  paths: {
    "/api/leaves": {
      get: { tags: ["leaves"], summary: "List", security: [{ sessionCookie: [] }], parameters: [{ name: "page", in: "query", schema: { type: "integer", default: 1 } }] },
      post: { tags: ["leaves"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } } },
    },
    "/api/leaves/{id}": { patch: { tags: ["leaves"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] } },
    "/api/health": { get: { tags: ["health"] } },
  },
}

describe("parseSpec()", () => {
  const eps = parseSpec(spec)

  it("lists every operation with its tag, lock and body type", () => {
    expect(eps.map((e) => e.id)).toEqual(["GET /api/leaves", "POST /api/leaves", "PATCH /api/leaves/{id}", "GET /api/health"])
    expect(eps[0].secured).toBe(true)
    expect(eps[3].secured).toBe(false)
    expect(eps[1].bodyType).toBe("application/json")
  })

  it("only auto-checks GET routes without ids", () => {
    expect(eps.filter(isAutoCheckable).map((e) => e.id)).toEqual(["GET /api/leaves", "GET /api/health"])
  })

  it("builds URLs with encoded path values and only filled query values", () => {
    expect(buildUrl(eps[2], { id: "a/b" })).toBe("/api/leaves/a%2Fb")
    expect(buildUrl(eps[0], { page: "2" })).toBe("/api/leaves?page=2")
    expect(buildUrl(eps[0], { page: "" })).toBe("/api/leaves")
  })
})

describe("sampleValue()", () => {
  it("prefers const, default and the first enum value", () => {
    expect(sampleValue({ const: true })).toBe(true)
    expect(sampleValue({ type: "integer", default: 30 })).toBe(30)
    expect(sampleValue({ type: "string", enum: ["approved", "rejected"] })).toBe("approved")
  })

  it("fills objects recursively and gives date-looking fields a date", () => {
    const v = sampleValue({ type: "object", properties: { from: { type: "string" }, n: { type: "integer", minimum: 5 }, tags: { type: "array", items: { type: "string" } } } }) as Record<string, unknown>
    expect(v.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(v.n).toBe(5)
    expect(v.tags).toEqual(["test tags"])
  })
})

describe("verdictOf()", () => {
  it("separates broken routes from refused or invalid calls", () => {
    expect(verdictOf(200)).toBe("ok")
    expect(verdictOf(204)).toBe("ok")
    expect(verdictOf(401)).toBe("denied")
    expect(verdictOf(403)).toBe("denied")
    expect(verdictOf(400)).toBe("invalid")
    expect(verdictOf(500)).toBe("broken")
    expect(verdictOf(0)).toBe("broken")
  })
})
