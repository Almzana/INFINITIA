// Placeholder attendance & turnover data for the HR dashboard.
// Replace with data from the time-attendance system / HRIS.
import { labelMap, t } from "@/i18n"
import { formatDate } from "@/lib/format"
import type { Employee } from "./mock"

export type AttendanceStatus = "on-time" | "late" | "left" | "early-leave" | "leave" | "absent"

export interface AttendanceRecord {
  employeeId: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
}

export const attendanceStatusLabel = labelMap<AttendanceStatus>("attendance.status", ["on-time", "late", "left", "early-leave", "leave", "absent"])

const pad = (n: number) => String(n).padStart(2, "0")
const time = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

function seeded(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

/** Simulated attendance for "today" at ~17:45, when people are starting to clock out. */
export function buildAttendance(employees: Employee[]): AttendanceRecord[] {
  const rand = seeded(7)
  return employees
    .filter((e) => e.status !== "resigned")
    .map((e) => {
      if (e.status === "leave") return { employeeId: e.id, checkIn: null, checkOut: null, status: "leave" as const }
      const r = rand()
      if (r < 0.04) return { employeeId: e.id, checkIn: null, checkOut: null, status: "absent" as const }
      // Most arrive 08:15–09:00, some late
      const late = r > 0.84
      const inMin = late ? 9 * 60 + 5 + Math.floor(rand() * 50) : 8 * 60 + 15 + Math.floor(rand() * 45)
      const o = rand()
      if (o < 0.08) {
        const outMin = 15 * 60 + Math.floor(rand() * 100)
        return { employeeId: e.id, checkIn: time(inMin), checkOut: time(outMin), status: "early-leave" as const }
      }
      if (o < 0.55) {
        // Office hours 09:00–17:30; already clocked out between 17:30 and 17:44
        const outMin = 17 * 60 + 30 + Math.floor(rand() * 15)
        return { employeeId: e.id, checkIn: time(inMin), checkOut: time(outMin), status: "left" as const }
      }
      return { employeeId: e.id, checkIn: time(inMin), checkOut: null, status: late ? ("late" as const) : ("on-time" as const) }
    })
}

/** Check-ins / check-outs per hour bucket for the chart. */
export function hourlyFlow(records: AttendanceRecord[]) {
  const buckets = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
  return buckets.map((b) => {
    const h = Number(b.slice(0, 2))
    return {
      hour: b,
      checkIn: records.filter((r) => r.checkIn && Number(r.checkIn.slice(0, 2)) === h).length,
      checkOut: records.filter((r) => r.checkOut && Number(r.checkOut.slice(0, 2)) === h).length,
    }
  })
}

/** Short month label for "yyyy-MM", e.g. "พ.ย. 68" / "Nov 25". */
export const monthLabel = (ym: string) => formatDate(`${ym}-01`, "MMM yyyy").replace(/\d{2}(\d{2})$/, "$1")

/** Monthly turnover for the last 12 months (placeholder). `month` is the label in the current language. */
export const turnoverTrend = [
  { ym: "2025-11", resigned: 1, hired: 2, headcount: 51 },
  { ym: "2025-12", resigned: 2, hired: 1, headcount: 50 },
  { ym: "2026-01", resigned: 3, hired: 4, headcount: 51 },
  { ym: "2026-02", resigned: 1, hired: 2, headcount: 52 },
  { ym: "2026-03", resigned: 2, hired: 3, headcount: 53 },
  { ym: "2026-04", resigned: 4, hired: 2, headcount: 51 },
  { ym: "2026-05", resigned: 1, hired: 3, headcount: 53 },
  { ym: "2026-06", resigned: 2, hired: 3, headcount: 54 },
  { ym: "2026-07", resigned: 1, hired: 2, headcount: 55 },
  { ym: "2026-08", resigned: 2, hired: 5, headcount: 58 },
  { ym: "2026-09", resigned: 1, hired: 4, headcount: 61 },
  { ym: "2026-10", resigned: 1, hired: 4, headcount: 64 },
].map((m) => ({
  ...m,
  get month() {
    return monthLabel(m.ym)
  },
  rate: Math.round((m.resigned / m.headcount) * 1000) / 10,
}))

export type ResignReason = "newJob" | "study" | "relocation" | "family" | "probation" | "other"
export const resignReasonLabel = labelMap<ResignReason>("attendance.reason", ["newJob", "study", "relocation", "family", "probation", "other"])

/** e.g. "2 ปี 4 เดือน" / "2 yr 4 mo" */
export const tenureLabel = (months: number) =>
  months >= 12 ? t("attendance.tenure.ym", { y: Math.floor(months / 12), m: months % 12 }) : t("attendance.tenure.m", { m: months })

export const resignReasons: { key: ResignReason; count: number }[] = [
  { key: "newJob", count: 8 },
  { key: "study", count: 3 },
  { key: "relocation", count: 3 },
  { key: "family", count: 2 },
  { key: "probation", count: 2 },
  { key: "other", count: 2 },
]

export const recentResignations: { name: string; position: string; department: string; lastDay: string; tenureMonths: number; reason: ResignReason; exitInterview: boolean }[] = [
  { name: "ศุภชัย ทองคำ", position: "Site Engineer", department: "ฝ่ายก่อสร้าง", lastDay: "2026-10-31", tenureMonths: 28, reason: "newJob", exitInterview: false },
  { name: "จิราพร แสงทอง", position: "3D Visualizer", department: "ฝ่ายออกแบบภายใน", lastDay: "2026-11-15", tenureMonths: 14, reason: "study", exitInterview: true },
  { name: "อนุชา บุญมา", position: "Junior Architect", department: "ฝ่ายสถาปัตยกรรม", lastDay: "2026-09-30", tenureMonths: 8, reason: "relocation", exitInterview: true },
  { name: "ปวีณา ใจดี", position: "Sales Consultant", department: "ฝ่ายการตลาด", lastDay: "2026-08-31", tenureMonths: 37, reason: "newJob", exitInterview: true },
  { name: "ภาณุ ศรีสุข", position: "Foreman", department: "ฝ่ายก่อสร้าง", lastDay: "2026-08-15", tenureMonths: 4, reason: "probation", exitInterview: false },
]
