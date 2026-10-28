// Placeholder attendance & turnover data for the HR dashboard.
// Replace with data from the time-attendance system / HRIS.
import type { Employee } from "./mock"

export type AttendanceStatus = "on-time" | "late" | "left" | "early-leave" | "leave" | "absent"

export interface AttendanceRecord {
  employeeId: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
}

export const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  "on-time": "ทำงานอยู่",
  late: "มาสาย (ยังอยู่)",
  left: "ออกงานแล้ว",
  "early-leave": "ออกก่อนเวลา",
  leave: "ลา",
  absent: "ขาดงาน",
}

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

/** Monthly turnover for the last 12 months (placeholder). */
export const turnoverTrend = [
  { month: "พ.ย. 68", resigned: 1, hired: 2, headcount: 51 },
  { month: "ธ.ค. 68", resigned: 2, hired: 1, headcount: 50 },
  { month: "ม.ค. 69", resigned: 3, hired: 4, headcount: 51 },
  { month: "ก.พ. 69", resigned: 1, hired: 2, headcount: 52 },
  { month: "มี.ค. 69", resigned: 2, hired: 3, headcount: 53 },
  { month: "เม.ย. 69", resigned: 4, hired: 2, headcount: 51 },
  { month: "พ.ค. 69", resigned: 1, hired: 3, headcount: 53 },
  { month: "มิ.ย. 69", resigned: 2, hired: 3, headcount: 54 },
  { month: "ก.ค. 69", resigned: 1, hired: 2, headcount: 55 },
  { month: "ส.ค. 69", resigned: 2, hired: 5, headcount: 58 },
  { month: "ก.ย. 69", resigned: 1, hired: 4, headcount: 61 },
  { month: "ต.ค. 69", resigned: 1, hired: 4, headcount: 64 },
].map((m) => ({ ...m, rate: Math.round((m.resigned / m.headcount) * 1000) / 10 }))

export const resignReasons = [
  { reason: "ได้งานใหม่ / เงินเดือนสูงกว่า", count: 8 },
  { reason: "ศึกษาต่อ", count: 3 },
  { reason: "ย้ายภูมิลำเนา", count: 3 },
  { reason: "ภาระครอบครัว", count: 2 },
  { reason: "ไม่ผ่านทดลองงาน", count: 2 },
  { reason: "อื่นๆ", count: 2 },
]

export const recentResignations = [
  { name: "ศุภชัย ทองคำ", position: "Site Engineer", department: "ฝ่ายก่อสร้าง", lastDay: "2026-10-31", tenure: "2 ปี 4 เดือน", reason: "ได้งานใหม่ / เงินเดือนสูงกว่า", exitInterview: false },
  { name: "จิราพร แสงทอง", position: "3D Visualizer", department: "ฝ่ายออกแบบภายใน", lastDay: "2026-11-15", tenure: "1 ปี 2 เดือน", reason: "ศึกษาต่อ", exitInterview: true },
  { name: "อนุชา บุญมา", position: "Junior Architect", department: "ฝ่ายสถาปัตยกรรม", lastDay: "2026-09-30", tenure: "8 เดือน", reason: "ย้ายภูมิลำเนา", exitInterview: true },
  { name: "ปวีณา ใจดี", position: "Sales Consultant", department: "ฝ่ายการตลาด", lastDay: "2026-08-31", tenure: "3 ปี 1 เดือน", reason: "ได้งานใหม่ / เงินเดือนสูงกว่า", exitInterview: true },
  { name: "ภาณุ ศรีสุข", position: "Foreman", department: "ฝ่ายก่อสร้าง", lastDay: "2026-08-15", tenure: "4 เดือน", reason: "ไม่ผ่านทดลองงาน", exitInterview: false },
]
