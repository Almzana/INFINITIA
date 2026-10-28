// Placeholder timesheet entries for the last few weeks. Replace with real data once people log time.
import { addDays, format, isWeekend, startOfWeek } from "date-fns"
import type { Employee } from "./mock"
import { currentPhase, type PhaseKey, type Project } from "./projects"

export interface TimeEntry {
  id: string
  employeeId: string
  projectId: string
  phase: PhaseKey
  date: string
  hours: number
  note?: string
}

/** Departments whose staff log time against projects */
export const projectDepartments = ["ฝ่ายสถาปัตยกรรม", "ฝ่ายออกแบบภายใน", "ฝ่ายก่อสร้าง", "ฝ่ายบริหาร"]

export const WEEK_HOURS = 40

export const weekStartOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })

function seeded(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

export function seedTimesheet(employees: Employee[], projects: Project[]): TimeEntry[] {
  const rand = seeded(11)
  const staff = employees.filter((e) => e.status !== "resigned" && e.status !== "leave" && projectDepartments.slice(0, 3).includes(e.department))
  const active = projects.filter((p) => currentPhase(p))
  if (!active.length) return []

  // Last 15 working days before today
  const days: string[] = []
  for (let d = addDays(new Date(), -1); days.length < 15; d = addDays(d, -1)) {
    if (!isWeekend(d)) days.push(format(d, "yyyy-MM-dd"))
  }

  const entries: TimeEntry[] = []
  staff.forEach((e, si) => {
    // Each person works on one or two projects
    const main = active[si % active.length]
    const side = active[(si * 7 + 3) % active.length]
    for (const date of days) {
      if (rand() < 0.06) continue // day off / missing entry
      const split = main.id !== side.id && rand() < 0.4
      const plan: [Project, number][] = split ? [[main, 5], [side, 3]] : [[main, 8]]
      for (const [p, hours] of plan) {
        entries.push({ id: `T${entries.length + 1}`, employeeId: e.id, projectId: p.id, phase: currentPhase(p)!.key, date, hours })
      }
    }
  })
  return entries
}
