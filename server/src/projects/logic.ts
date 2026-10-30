// Project planning & billing rules. Server-side copy of the rules in the frontend's src/data/projects.ts
// (phase plan, payment schedule, billing triggers) — the server is the source of truth for money.
// Keep both in sync when the schedule changes.

export type ProjectType = "design-build" | "architecture" | "interior" | "construction"
export type PhaseKey = "concept" | "schematic" | "design-dev" | "construction-docs" | "permit" | "construction" | "handover"

export interface Phase {
  key: PhaseKey
  start: string
  end: string
  progress: number
}

export interface InstallmentPlan {
  title: string
  amount: number
  phase: PhaseKey | null
  atProgress: number
  dueDate: string
}

const WARRANTY_DAYS = 365

const phaseWeight: Record<PhaseKey, number> = {
  concept: 5,
  schematic: 8,
  "design-dev": 10,
  "construction-docs": 10,
  permit: 5,
  construction: 55,
  handover: 7,
}

export const phasesByType: Record<ProjectType, PhaseKey[]> = {
  "design-build": ["concept", "schematic", "design-dev", "construction-docs", "permit", "construction", "handover"],
  architecture: ["concept", "schematic", "design-dev", "construction-docs", "permit"],
  interior: ["concept", "schematic", "design-dev", "construction-docs", "construction", "handover"],
  construction: ["permit", "construction", "handover"],
}

// [title, % of contract, trigger phase (null = retention), trigger at phase progress %]
type Template = [string, number, PhaseKey | null, number]
const paymentSchedules: Record<ProjectType, Template[]> = {
  "design-build": [
    ["มัดจำเซ็นสัญญา", 10, "concept", 0],
    ["อนุมัติแบบร่าง", 10, "schematic", 100],
    ["แบบก่อสร้างเสร็จสมบูรณ์", 10, "construction-docs", 100],
    ["งานโครงสร้างแล้วเสร็จ", 15, "construction", 30],
    ["งานสถาปัตยกรรมและระบบ", 15, "construction", 60],
    ["งานก่อสร้างแล้วเสร็จ", 20, "construction", 100],
    ["ส่งมอบงาน", 15, "handover", 100],
    ["คืนเงินประกันผลงาน", 5, null, 100],
  ],
  architecture: [
    ["มัดจำเซ็นสัญญา", 20, "concept", 0],
    ["อนุมัติแบบร่าง", 25, "schematic", 100],
    ["พัฒนาแบบแล้วเสร็จ", 25, "design-dev", 100],
    ["ส่งมอบแบบก่อสร้าง", 20, "construction-docs", 100],
    ["ได้รับใบอนุญาตก่อสร้าง", 10, "permit", 100],
  ],
  interior: [
    ["มัดจำเซ็นสัญญา", 15, "concept", 0],
    ["อนุมัติแบบตกแต่ง", 20, "design-dev", 100],
    ["สั่งผลิตเฟอร์นิเจอร์", 15, "construction-docs", 100],
    ["ติดตั้งงานตกแต่ง 50%", 25, "construction", 50],
    ["ส่งมอบงาน", 20, "handover", 100],
    ["คืนเงินประกันผลงาน", 5, null, 100],
  ],
  construction: [
    ["มัดจำเซ็นสัญญา", 10, "permit", 0],
    ["งานก่อสร้าง 25%", 20, "construction", 25],
    ["งานก่อสร้าง 50%", 20, "construction", 50],
    ["งานก่อสร้าง 75%", 20, "construction", 75],
    ["งานก่อสร้างแล้วเสร็จ", 15, "construction", 100],
    ["ส่งมอบงาน", 10, "handover", 100],
    ["คืนเงินประกันผลงาน", 5, null, 100],
  ],
}

const DAY = 86_400_000
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`)
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => iso(parse(d) + n * DAY)
const daysBetween = (a: string, b: string) => Math.round((parse(b) - parse(a)) / DAY)
// Business "today" is Bangkok (UTC+7, no DST); the server itself may run in UTC
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
export const todayISO = () => iso(Date.now() + BANGKOK_OFFSET_MS)

/** Lay phases across the project timeline by weight, all at 0% progress. */
export function buildPhases(type: ProjectType, start: string, end: string): Phase[] {
  const keys = phasesByType[type]
  const total = keys.reduce((s, k) => s + phaseWeight[k], 0)
  const days = Math.max(1, daysBetween(start, end))
  let cum = 0
  return keys.map((key) => {
    const w = phaseWeight[key]
    const phase = { key, start: addDays(start, Math.round((cum / total) * days)), end: addDays(start, Math.round(((cum + w) / total) * days)), progress: 0 }
    cum += w
    return phase
  })
}

function triggerDate(phases: Phase[], phase: PhaseKey | null, atProgress: number) {
  if (phase === null) return addDays(phases[phases.length - 1].end, WARRANTY_DAYS)
  const p = phases.find((x) => x.key === phase)!
  return addDays(p.start, Math.round((daysBetween(p.start, p.end) * atProgress) / 100))
}

export function buildInstallments(type: ProjectType, value: number, phases: Phase[]): InstallmentPlan[] {
  return paymentSchedules[type].map(([title, pct, phase, atProgress]) => ({
    title,
    amount: Math.round((value * pct) / 100),
    phase,
    atProgress,
    dueDate: triggerDate(phases, phase, atProgress),
  }))
}

/** Has the billing trigger for this installment been reached? */
export function isTriggered(phases: Phase[], inst: { phase: PhaseKey | null; atProgress: number; dueDate: string; changeOrderId: string | null }, today = todayISO()) {
  if (inst.changeOrderId) return true
  if (inst.phase === null) return phases.every((p) => p.progress === 100) && inst.dueDate <= today
  const p = phases.find((x) => x.key === inst.phase)
  return !!p && (inst.atProgress === 0 ? true : p.progress >= inst.atProgress)
}

export { addDays }
