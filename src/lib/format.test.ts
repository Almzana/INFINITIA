import { afterEach, describe, expect, it } from "vitest"
import { setCurrentLang } from "@/i18n/core"
import { formatDate, formatMillion, formatPercent, initials } from "@/lib/format"

afterEach(() => setCurrentLang("th"))

describe("formatDate()", () => {
  it("uses the Buddhist year in Thai", () => {
    expect(formatDate("2026-01-05", "d/M/yyyy")).toBe("5/1/2569")
    expect(formatDate("2026-01-05")).toMatch(/2569$/)
  })

  it("uses the Gregorian year and English months in English", () => {
    setCurrentLang("en")
    expect(formatDate("2026-01-05")).toBe("5 Jan 2026")
    expect(formatDate("2026-12-31", "d MMM")).toBe("31 Dec")
  })
})

describe("formatMillion()", () => {
  it("formats millions per language", () => {
    expect(formatMillion(128_500_000)).toBe("฿128.5 ล้าน")
    setCurrentLang("en")
    expect(formatMillion(128_500_000)).toBe("฿128.5M")
    expect(formatMillion(1_234_567_890, 2)).toBe("฿1,234.57M")
  })
})

describe("small helpers", () => {
  it("formatPercent", () => {
    expect(formatPercent(0.1234)).toBe("12.3%")
    expect(formatPercent(1, 0)).toBe("100%")
  })

  it("initials skip Thai leading vowels", () => {
    expect(initials("John", "Smith")).toBe("JS")
    expect(initials("เอก", "ใจดี")).toBe("อจ")
    expect(initials("Solo")).toBe("S")
  })
})
