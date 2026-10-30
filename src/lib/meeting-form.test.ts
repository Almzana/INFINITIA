import { describe, expect, it } from "vitest"
import type { Booking } from "@/data/mock"
import { t } from "@/i18n/core"
import { type MeetingFormValues, pct, slots, toMeetingForm, toMeetingInput, toMin, validateMeeting } from "@/lib/meeting-form"

const existing: Booking = { id: "m1", roomId: "r1", title: "Weekly", date: "2026-03-10", start: "10:00", end: "11:00", owner: "x" }

const form = (patch: Partial<MeetingFormValues> = {}): MeetingFormValues => ({
  roomId: "r1",
  title: "Design review",
  date: "2026-03-10",
  start: "09:00",
  end: "10:00",
  agenda: "",
  minutes: "",
  attendeeIds: [],
  ...patch,
})

describe("slots / time helpers", () => {
  it("has half-hour slots from 08:00 to 18:00", () => {
    expect(slots[0]).toBe("08:00")
    expect(slots[1]).toBe("08:30")
    expect(slots.at(-1)).toBe("18:00")
    expect(slots).toHaveLength(21)
  })

  it("converts times", () => {
    expect(toMin("09:30")).toBe(570)
    expect(pct("08:00")).toBe(0)
    expect(pct("13:00")).toBe(50)
    expect(pct("18:00")).toBe(100)
  })
})

describe("validateMeeting()", () => {
  it("accepts a free slot, including back-to-back", () => {
    expect(validateMeeting(form(), [existing])).toEqual({})
    expect(validateMeeting(form({ start: "11:00", end: "12:00" }), [existing])).toEqual({})
  })

  it("requires a title and date, and end after start", () => {
    expect(validateMeeting(form({ title: "  " }), [])).toEqual({ title: t("rooms.error.titleRequired") })
    expect(validateMeeting(form({ date: "" }), [])).toEqual({ date: t("rooms.error.dateRequired") })
    expect(validateMeeting(form({ start: "10:00", end: "10:00" }), [])).toEqual({ end: t("rooms.error.endBeforeStart") })
    expect(validateMeeting(form({ start: "11:00", end: "10:30" }), [])).toEqual({ end: t("rooms.error.endBeforeStart") })
  })

  it.each([
    ["overlapping start", "10:30", "11:30"],
    ["overlapping end", "09:30", "10:30"],
    ["inside", "10:15", "10:45"],
    ["surrounding", "09:00", "12:00"],
  ])("reports a clash: %s", (_name, start, end) => {
    const errors = validateMeeting(form({ start, end }), [existing])
    expect(errors).toEqual({ form: t("rooms.error.clash", { title: "Weekly", start: "10:00", end: "11:00" }) })
  })

  it("ignores other rooms, other days and the meeting being edited", () => {
    const clashTime = { start: "10:30", end: "11:30" }
    expect(validateMeeting(form({ ...clashTime, roomId: "r2" }), [existing])).toEqual({})
    expect(validateMeeting(form({ ...clashTime, date: "2026-03-11" }), [existing])).toEqual({})
    expect(validateMeeting(form(clashTime), [existing], "m1")).toEqual({})
  })
})

describe("toMeetingForm() / toMeetingInput()", () => {
  it("defaults to a one-hour slot", () => {
    expect(toMeetingForm(null, { roomId: "r1", date: "2026-03-10", start: "09:00" }).end).toBe("10:00")
  })

  it("clamps the default end to the last slot", () => {
    expect(toMeetingForm(null, { roomId: "r1", date: "2026-03-10", start: "17:30" }).end).toBe("18:00")
  })

  it("loads an existing meeting, with empty strings for missing text", () => {
    const v = toMeetingForm(existing, { roomId: "r9", date: "2000-01-01", start: "08:00" })
    expect(v).toMatchObject({ roomId: "r1", start: "10:00", end: "11:00", agenda: "", minutes: "", attendeeIds: [] })
  })

  it("trims title/agenda and sends null for an empty agenda", () => {
    const input = toMeetingInput(form({ title: "  Kickoff ", agenda: "   " }))
    expect(input.title).toBe("Kickoff")
    expect(input.agenda).toBeNull()
  })
})
