import { describe, expect, it } from "vitest"
import { can, canSeePage, landingAfterLogin } from "@/lib/access"

describe("canSeePage()", () => {
  it("hides everything when signed out", () => {
    expect(canSeePage("/", undefined)).toBe(false)
  })

  it.each([
    ["/projects", { staff: true, hr: false, executive: true }],
    ["/timesheet", { staff: true, hr: false, executive: true }],
    ["/audit", { staff: false, hr: false, executive: true }],
    ["/employees", { staff: true, hr: true, executive: true }],
    ["/leave", { staff: true, hr: true, executive: true }],
  ] as const)("%s", (url, expected) => {
    expect(canSeePage(url, "staff")).toBe(expected.staff)
    expect(canSeePage(url, "hr")).toBe(expected.hr)
    expect(canSeePage(url, "executive")).toBe(expected.executive)
  })

  it("only executives see the audit trail", () => {
    expect(canSeePage("/audit", "executive")).toBe(true)
    expect(canSeePage("/audit", "hr")).toBe(false)
    expect(canSeePage("/audit", "staff")).toBe(false)
  })

  it("unknown pages are open to every role", () => {
    expect(canSeePage("/something-new", "staff")).toBe(true)
  })
})

describe("can", () => {
  it("lets HR and executives manage, not staff", () => {
    expect(can.manageEmployees("hr")).toBe(true)
    expect(can.approveLeave("executive")).toBe(true)
    expect(can.manageAnnouncements("staff")).toBe(false)
    expect(can.viewProjects("hr")).toBe(false)
    expect(can.viewProjects("staff")).toBe(true)
  })
})

describe("landingAfterLogin()", () => {
  it("sends non-developers away from the Developer Console", () => {
    expect(landingAfterLogin("/dev", { role: "staff" })).toBe("/")
    expect(landingAfterLogin("/dev?tab=monitor", { role: "executive" })).toBe("/")
    expect(landingAfterLogin("/dev?tab=monitor", { role: "staff", isDeveloper: true })).toBe("/dev?tab=monitor")
  })

  it("keeps a page the role may open, with its query", () => {
    expect(landingAfterLogin("/leave?view=LV1", { role: "staff" })).toBe("/leave?view=LV1")
    expect(landingAfterLogin("/projects/PR001", { role: "executive" })).toBe("/projects/PR001")
  })

  it("goes home for pages the role may not open, and for odd targets", () => {
    expect(landingAfterLogin("/projects/PR001", { role: "hr" })).toBe("/")
    expect(landingAfterLogin("/audit", { role: "staff" })).toBe("/")
    expect(landingAfterLogin(undefined, { role: "staff" })).toBe("/")
    expect(landingAfterLogin("//evil.example", { role: "staff" })).toBe("/")
    expect(landingAfterLogin("/login", { role: "staff" })).toBe("/")
  })
})
