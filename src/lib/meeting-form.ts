import type { Booking } from "@/data/mock"
import type { MeetingInput } from "@/lib/meetings-api"
import { t } from "@/i18n"

export const START_HOUR = 8
export const END_HOUR = 18
export const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
/** Bookable half-hour marks, 08:00 … 18:00 */
export const slots = Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }, (_, i) => {
  const m = START_HOUR * 60 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`
})
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
/** Horizontal position of a time on the day timeline, in % */
export const pct = (t: string) => ((toMin(t) - START_HOUR * 60) / ((END_HOUR - START_HOUR) * 60)) * 100

export interface MeetingFormValues {
  roomId: string
  title: string
  date: string
  start: string
  end: string
  agenda: string
  minutes: string
  attendeeIds: string[]
}

export type MeetingErrors = Partial<Record<keyof MeetingFormValues | "form", string>>

export function toMeetingForm(m: Booking | null, defaults: { roomId: string; date: string; start: string }): MeetingFormValues {
  if (m) {
    return { roomId: m.roomId, title: m.title, date: m.date, start: m.start, end: m.end, agenda: m.agenda ?? "", minutes: m.minutes ?? "", attendeeIds: m.attendeeIds ?? [] }
  }
  const endIdx = Math.min(slots.indexOf(defaults.start) + 2, slots.length - 1)
  return { ...defaults, title: "", end: slots[endIdx], agenda: "", minutes: "", attendeeIds: [] }
}

export function toMeetingInput(v: MeetingFormValues): MeetingInput {
  return { roomId: v.roomId, title: v.title.trim(), date: v.date, start: v.start, end: v.end, agenda: v.agenda.trim() || null, attendeeIds: v.attendeeIds }
}

/** Client-side check against what is loaded; the database has the final say (409 ROOM_TAKEN). */
export function validateMeeting(v: MeetingFormValues, bookings: Booking[], selfId?: string): MeetingErrors {
  if (!v.title.trim()) return { title: t("rooms.error.titleRequired") }
  if (!v.date) return { date: t("rooms.error.dateRequired") }
  if (toMin(v.end) <= toMin(v.start)) return { end: t("rooms.error.endBeforeStart") }
  const clash = bookings.find(
    (b) => b.id !== selfId && b.roomId === v.roomId && b.date === v.date && toMin(b.start) < toMin(v.end) && toMin(v.start) < toMin(b.end),
  )
  return clash ? { form: t("rooms.error.clash", { title: clash.title, start: clash.start, end: clash.end }) } : {}
}
