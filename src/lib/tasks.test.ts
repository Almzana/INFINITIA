import { afterEach, describe, expect, it } from "vitest"
import { setCurrentLang, t } from "@/i18n/core"
import { formatDate } from "@/lib/format"
import { dueInfo } from "@/lib/tasks"

afterEach(() => setCurrentLang("th"))

describe("dueInfo()", () => {
  const today = "2026-03-10"

  it("is null without a due date", () => {
    expect(dueInfo(null, today)).toBeNull()
  })

  it("flags overdue dates", () => {
    setCurrentLang("en")
    expect(dueInfo("2026-03-09", today)).toEqual({ label: "Overdue · 9 Mar", tone: "overdue" })
  })

  it("marks today and tomorrow", () => {
    expect(dueInfo(today, today)).toEqual({ label: t("common.today"), tone: "today" })
    expect(dueInfo("2026-03-11", today)).toEqual({ label: t("common.tomorrow"), tone: "normal" })
  })

  it("handles tomorrow across a month end", () => {
    expect(dueInfo("2026-03-01", "2026-02-28")?.label).toBe(t("common.tomorrow"))
  })

  it("shows a plain date further out", () => {
    expect(dueInfo("2026-04-20", today)).toEqual({ label: formatDate("2026-04-20", "d MMM"), tone: "normal" })
  })
})
