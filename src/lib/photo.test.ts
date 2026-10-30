import { describe, expect, it } from "vitest"
import { clampSquare, photoUrl } from "@/lib/photo"

describe("photoUrl()", () => {
  it("is undefined when there is no photo", () => {
    expect(photoUrl("E1", null)).toBeUndefined()
    expect(photoUrl("E1")).toBeUndefined()
    expect(photoUrl("E1", 0)).toBeUndefined()
  })

  it("adds the version for cache busting", () => {
    expect(photoUrl("E1", 1700000000000)).toBe("/api/employees/E1/photo?v=1700000000000")
  })

  it("encodes the id", () => {
    expect(photoUrl("a/b?c", 2)).toBe("/api/employees/a%2Fb%3Fc/photo?v=2")
  })
})

describe("clampSquare()", () => {
  it("keeps an inside square as is (rounded)", () => {
    expect(clampSquare({ x: 10.4, y: 20.6, width: 100, height: 100 }, 400, 300)).toEqual({ x: 10, y: 21, side: 100 })
  })

  it("pulls a square that pokes past an edge back inside", () => {
    expect(clampSquare({ x: 301, y: -2, width: 100, height: 100 }, 400, 300)).toEqual({ x: 300, y: 0, side: 100 })
  })

  it("makes it square and never larger than the picture", () => {
    expect(clampSquare({ x: 0, y: 0, width: 500, height: 480 }, 400, 300)).toEqual({ x: 0, y: 0, side: 300 })
  })
})
