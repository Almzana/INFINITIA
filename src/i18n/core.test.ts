import { afterEach, describe, expect, it } from "vitest"
import * as common from "./locales/common"
import { deptLabel, getLang, labelMap, setCurrentLang, t } from "./core"

const locales = import.meta.glob<{ th: Record<string, string>; en: Record<string, string> }>("./locales/*.ts", { eager: true })

afterEach(() => setCurrentLang("th"))

describe("t()", () => {
  it("defaults to Thai", () => {
    expect(getLang()).toBe("th")
    expect(t("common.today")).toBe(common.th.today)
  })

  it("follows the current language", () => {
    setCurrentLang("en")
    expect(t("common.today")).toBe(common.en.today)
  })

  it("fills {placeholders} and leaves unknown ones alone", () => {
    setCurrentLang("en")
    expect(t("tasks.overdue", { date: "5 Jan" })).toBe("Overdue · 5 Jan")
    expect(t("tasks.overdue")).toBe("Overdue · {date}")
    expect(t("tasks.overdue", { other: 1 })).toBe("Overdue · {date}")
  })

  it("returns the key itself when missing", () => {
    expect(t("nope.missing")).toBe("nope.missing")
    expect(t("common.__missing__")).toBe("common.__missing__")
  })
})

describe("labelMap()", () => {
  it("translates on every read", () => {
    const map = labelMap("tasks.priority", ["high", "low"] as const)
    const thHigh = map.high
    setCurrentLang("en")
    expect(map.high).toBe(t("tasks.priority.high"))
    expect(map.high).not.toBe(thHigh)
    expect(Object.keys(map)).toEqual(["high", "low"])
  })
})

describe("deptLabel()", () => {
  it("keeps Thai names in Thai and translates known ones to English", () => {
    expect(deptLabel("ฝ่ายบุคคล")).toBe("ฝ่ายบุคคล")
    setCurrentLang("en")
    expect(deptLabel("ฝ่ายบุคคล")).not.toBe("ฝ่ายบุคคล")
    expect(deptLabel("Unknown dept")).toBe("Unknown dept")
  })
})

describe("locale files", () => {
  it.each(Object.keys(locales))("%s has the same keys in th and en", (file) => {
    const { th, en } = locales[file]
    expect(Object.keys(en).sort()).toEqual(Object.keys(th).sort())
  })
})
