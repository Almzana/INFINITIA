// Project names come from the public portfolio at infini-ia.com/portfolio.
// All financial figures, dates and progress are PLACEHOLDERS for the demo —
// replace them with data from the accounting / ERP system.
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import { labelMap, t } from "@/i18n"
import { todayISO } from "@/lib/format"

export type ProjectType = "design-build" | "architecture" | "interior" | "construction"
export type ProjectStatus = "completed" | "in-progress" | "design" | "handover"
export type PhaseKey = "concept" | "schematic" | "design-dev" | "construction-docs" | "permit" | "construction" | "handover"

export interface Phase {
  key: PhaseKey
  start: string
  end: string
  progress: number
}

export type InstallmentStatus = "pending" | "invoiced" | "paid"

/** A payment installment (งวดเงิน), triggered when a phase reaches `atProgress`. */
export interface Installment {
  id: string
  title: string
  amount: number
  /** Phase that triggers billing; null for the warranty retention released after handover */
  phase: PhaseKey | null
  atProgress: number
  dueDate: string
  status: InstallmentStatus
  paidDate?: string
  changeOrderId?: string
}

export type ChangeOrderStatus = "pending" | "approved" | "rejected"

export interface ChangeOrder {
  id: string
  title: string
  description: string
  /** Change to the contract price (THB); negative for reduced scope */
  amount: number
  /** Change to the project cost (THB) */
  costImpact: number
  daysImpact: number
  status: ChangeOrderStatus
  requestedBy: "ลูกค้า" | "บริษัท"
  date: string
  decidedDate?: string
}

export interface Project {
  id: string
  name: string
  type: ProjectType
  location: string
  areaSqm: number
  /** Original contract value (THB), excluding change orders */
  value: number
  /** Budgeted material & subcontract cost (THB), excluding design labour and change orders */
  cost: number
  start: string
  end: string
  manager: string
  /** Design hours logged before the timesheet module existed */
  priorHours: number
  phases: Phase[]
  installments: Installment[]
  changeOrders: ChangeOrder[]
  /** Total hours in the timesheet (from the API, all people) */
  loggedHours?: number
  /** User who created it (null for imported projects); Leaders may only edit their own */
  createdByUserId?: string | null
  /** Employee ids of the members: only they log timesheet hours on it (from the API) */
  memberIds?: string[]
}

export const projectTypeLabel = labelMap<ProjectType>("projectLabels.type", ["design-build", "architecture", "interior", "construction"])

export const projectStatusLabel = labelMap<ProjectStatus>("projectLabels.status", ["completed", "handover", "in-progress", "design"])

/** Phase entry whose label is translated on every read */
const phaseEntry = (key: PhaseKey, weight: number) => ({
  get label() {
    return t(`projectLabels.phase.${key}`)
  },
  weight,
})

/** weight = share of overall progress and of the project timeline */
export const phaseInfo: Record<PhaseKey, { readonly label: string; weight: number }> = {
  concept: phaseEntry("concept", 5),
  schematic: phaseEntry("schematic", 8),
  "design-dev": phaseEntry("design-dev", 10),
  "construction-docs": phaseEntry("construction-docs", 10),
  permit: phaseEntry("permit", 5),
  construction: phaseEntry("construction", 55),
  handover: phaseEntry("handover", 7),
}

export const phasesByType: Record<ProjectType, PhaseKey[]> = {
  "design-build": ["concept", "schematic", "design-dev", "construction-docs", "permit", "construction", "handover"],
  architecture: ["concept", "schematic", "design-dev", "construction-docs", "permit"],
  interior: ["concept", "schematic", "design-dev", "construction-docs", "construction", "handover"],
  construction: ["permit", "construction", "handover"],
}

export const installmentStatusLabel = labelMap<InstallmentStatus>("projectLabels.installment", ["pending", "invoiced", "paid"])

export const changeOrderStatusLabel = labelMap<ChangeOrderStatus>("projectLabels.changeOrder", ["pending", "approved", "rejected"])

/** Average loaded cost of one design/engineering hour (THB) used to cost the timesheet */
export const LABOR_RATE = 750
/** Warranty period before the retention installment is released */
const WARRANTY_DAYS = 365

const iso = (d: Date) => format(d, "yyyy-MM-dd")

// [title, % of contract, trigger phase (null = retention), trigger at phase progress %]
type Template = [string, number, PhaseKey | null, number]
export const paymentSchedules: Record<ProjectType, Template[]> = {
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

/** Lay phases across the project timeline (by weight) and fill progress up to `progress`%. */
export function buildPhases(type: ProjectType, start: string, end: string, progress: number): Phase[] {
  const keys = phasesByType[type]
  const total = keys.reduce((s, k) => s + phaseInfo[k].weight, 0)
  const days = Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)))
  const reached = (progress / 100) * total
  let cum = 0
  return keys.map((key) => {
    const w = phaseInfo[key].weight
    const phase: Phase = {
      key,
      start: iso(addDays(parseISO(start), Math.round((cum / total) * days))),
      end: iso(addDays(parseISO(start), Math.round(((cum + w) / total) * days))),
      progress: Math.max(0, Math.min(100, Math.round(((reached - cum) / w) * 100))),
    }
    cum += w
    return phase
  })
}

function triggerDate(phases: Phase[], phase: PhaseKey | null, atProgress: number) {
  if (phase === null) {
    const last = phases[phases.length - 1]
    return iso(addDays(parseISO(last.end), WARRANTY_DAYS))
  }
  const p = phases.find((x) => x.key === phase)!
  const span = differenceInCalendarDays(parseISO(p.end), parseISO(p.start))
  return iso(addDays(parseISO(p.start), Math.round((span * atProgress) / 100)))
}

/** Has the billing trigger for this installment been reached? */
export function isTriggered(phases: Phase[], inst: Pick<Installment, "phase" | "atProgress" | "dueDate" | "changeOrderId">, today = todayISO()) {
  if (inst.changeOrderId) return true
  if (inst.phase === null) return phases.every((p) => p.progress === 100) && inst.dueDate <= today
  const p = phases.find((x) => x.key === inst.phase)
  return !!p && (inst.atProgress === 0 ? true : p.progress >= inst.atProgress)
}

export function buildInstallments(projectId: string, type: ProjectType, value: number, phases: Phase[]): Installment[] {
  return paymentSchedules[type].map(([title, pct, phase, atProgress], i) => ({
    id: `${projectId}-I${i + 1}`,
    title,
    amount: Math.round((value * pct) / 100),
    phase,
    atProgress,
    dueDate: triggerDate(phases, phase, atProgress),
    status: "pending",
  }))
}

export function weightedProgress(phases: Phase[]) {
  const total = phases.reduce((s, p) => s + phaseInfo[p.key].weight, 0)
  return total ? Math.round(phases.reduce((s, p) => s + phaseInfo[p.key].weight * p.progress, 0) / total) : 0
}

export function currentPhase(p: Project): Phase | undefined {
  return p.phases.find((ph) => ph.progress < 100)
}

export function projectStatus(p: Project): ProjectStatus {
  const cur = currentPhase(p)
  if (!cur) return "completed"
  if (cur.key === "handover") return "handover"
  if (cur.key === "construction") return "in-progress"
  return "design"
}

export interface ProjectFinance {
  progress: number
  /** Contract value including approved change orders */
  contract: number
  changeOrderValue: number
  /** Material/subcontract cost including approved change orders */
  directCost: number
  hours: number
  laborCost: number
  totalCost: number
  profit: number
  margin: number
  collected: number
  invoiced: number
  overdue: number
  outstanding: number
  pendingChangeOrders: number
}

export function financeOf(p: Project, loggedHours = 0, today = todayISO()): ProjectFinance {
  const approved = p.changeOrders.filter((c) => c.status === "approved")
  const changeOrderValue = approved.reduce((s, c) => s + c.amount, 0)
  const contract = p.value + changeOrderValue
  const directCost = p.cost + approved.reduce((s, c) => s + c.costImpact, 0)
  const hours = p.priorHours + loggedHours
  const laborCost = hours * LABOR_RATE
  const totalCost = directCost + laborCost
  const collected = p.installments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)
  const invoicedList = p.installments.filter((i) => i.status === "invoiced")
  return {
    progress: weightedProgress(p.phases),
    contract,
    changeOrderValue,
    directCost,
    hours,
    laborCost,
    totalCost,
    profit: contract - totalCost,
    margin: contract ? (contract - totalCost) / contract : 0,
    collected,
    invoiced: invoicedList.reduce((s, i) => s + i.amount, 0),
    overdue: invoicedList.filter((i) => i.dueDate < today).reduce((s, i) => s + i.amount, 0),
    outstanding: contract - collected,
    pendingChangeOrders: p.changeOrders.filter((c) => c.status === "pending").length,
  }
}

/** Create a new project with its phase plan and payment schedule. */
export function createProject(input: Pick<Project, "id" | "name" | "type" | "location" | "areaSqm" | "value" | "cost" | "start" | "end" | "manager">): Project {
  const phases = buildPhases(input.type, input.start, input.end, 0)
  return { ...input, priorHours: 0, phases, installments: buildInstallments(input.id, input.type, input.value, phases), changeOrders: [] }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const M = 1_000_000

// [name, type, location, area, value(M), cost(M), start, end, manager]
const rows: [string, ProjectType, string, number, number, number, string, string, string][] = [
  ["The Arcadia Residence", "design-build", "กรุงเทพฯ", 1450, 128, 90.4, "2023-03-01", "2025-02-28", "PM สมชาย"],
  ["Château Blanc Residence", "design-build", "นนทบุรี", 1200, 96.5, 70.1, "2023-06-15", "2025-05-30", "PM วิชัย"],
  ["The Sienna Manor", "design-build", "กรุงเทพฯ", 980, 74, 54.8, "2023-09-01", "2025-07-15", "PM สมชาย"],
  ["The Crown Residence", "design-build", "ปทุมธานี", 1600, 152, 112, "2023-11-01", "2025-10-31", "PM ธนพล"],
  ["The Colonnade Palace", "design-build", "กรุงเทพฯ", 2100, 186, 137.2, "2024-01-10", "2026-01-20", "PM วิชัย"],
  ["The Lumière Manor", "interior", "กรุงเทพฯ", 760, 38.5, 25.8, "2024-04-01", "2025-06-30", "ID อรุณี"],
  ["The Grandeur Mansion Residence", "design-build", "สมุทรปราการ", 1850, 164, 124.5, "2024-02-01", "2026-03-15", "PM ธนพล"],
  ["Timeless Sanctuary", "architecture", "เชียงใหม่", 640, 9.8, 4.6, "2024-06-01", "2025-03-31", "AR ณัฐวุฒิ"],
  ["The Portico Residence", "design-build", "กรุงเทพฯ", 1100, 88, 65.8, "2024-05-15", "2026-04-30", "PM สมชาย"],
  ["Jewel of the Lake", "design-build", "นครราชสีมา", 1380, 118, 88.2, "2024-08-01", "2026-11-30", "PM วิชัย"],
  ["The Crescent Residence", "interior", "กรุงเทพฯ", 820, 42, 29.2, "2025-01-10", "2026-02-28", "ID กมลชนก"],
  ["Noir Grandeur", "design-build", "กรุงเทพฯ", 1520, 142, 106.9, "2025-02-01", "2027-03-31", "PM ธนพล"],
  ["The Infinite Horizon", "design-build", "ชลบุรี", 1750, 158, 115.6, "2025-04-01", "2027-06-30", "PM สมชาย"],
  ["Golden Nakara", "design-build", "กรุงเทพฯ", 1300, 112, 84.7, "2025-03-15", "2027-01-31", "PM วิชัย"],
  ["The Obsidian Residence", "construction", "นนทบุรี", 1180, 84, 70.2, "2025-06-01", "2027-02-28", "PM ธนพล"],
  ["The Monarch Residence", "design-build", "กรุงเทพฯ", 1900, 176, 129.3, "2025-07-01", "2027-09-30", "PM สมชาย"],
  ["Vertigo Monarch", "architecture", "ภูเก็ต", 1250, 14.5, 7.4, "2025-01-15", "2025-12-15", "AR ณัฐวุฒิ"],
  ["Princess Château Residence", "design-build", "กรุงเทพฯ", 1650, 148, 111.3, "2025-09-01", "2027-11-30", "PM วิชัย"],
  ["Home-X One", "interior", "กรุงเทพฯ", 540, 24, 16.9, "2026-01-15", "2026-12-20", "ID อรุณี"],
  ["The Nature Embrace Residence", "design-build", "เชียงใหม่", 1420, 126, 92.6, "2026-05-01", "2028-03-31", "AR ณัฐวุฒิ"],
  ["The Arches Manor Residence", "design-build", "กรุงเทพฯ", 1580, 138, 101.6, "2026-07-01", "2028-05-31", "AR ปวีณา"],
  ["105 Residence", "interior", "กรุงเทพฯ", 480, 19.5, 13.5, "2026-08-15", "2027-04-30", "ID กมลชนก"],
]

// Change orders keyed by project name: [title, description, amount(M), cost(M), days, status, requestedBy, date]
const seedChangeOrders: Record<string, [string, string, number, number, number, ChangeOrderStatus, ChangeOrder["requestedBy"], string][]> = {
  "Noir Grandeur": [
    ["เพิ่มห้องโฮมเธียเตอร์ชั้นใต้ดิน", "ขุดเพิ่มชั้นใต้ดินบางส่วน พร้อมระบบเสียงและอะคูสติก", 6.8, 4.9, 45, "approved", "ลูกค้า", "2026-04-18"],
    ["เปลี่ยนหินอ่อนโถงทางเข้าเป็น Calacatta Oro", "อัปเกรดวัสดุพื้นและผนังโถงหลัก 180 ตร.ม.", 2.4, 1.7, 14, "pending", "ลูกค้า", "2026-10-12"],
  ],
  "The Infinite Horizon": [
    ["ขยายสระว่ายน้ำ Infinity Edge", "เพิ่มความยาวสระจาก 18 ม. เป็น 25 ม. และระบบน้ำเกลือ", 3.9, 2.8, 30, "approved", "ลูกค้า", "2026-02-10"],
    ["ระบบ Smart Home ทั้งหลัง", "ติดตั้งระบบควบคุมไฟ ม่าน แอร์ และกล้องผ่านแอป", 2.2, 1.5, 10, "pending", "ลูกค้า", "2026-10-20"],
  ],
  "Golden Nakara": [
    ["ลดงานสวนแนวตั้งด้านทิศใต้", "ลูกค้าขอเปลี่ยนเป็นระแนงไม้แทนสวนแนวตั้ง", -0.8, -0.6, -7, "approved", "ลูกค้า", "2026-06-05"],
    ["เสริมฐานรากใต้ห้องสมุด", "ผลเจาะสำรวจดินพบชั้นดินอ่อนกว่าที่ประเมิน", 0, 0.9, 12, "approved", "บริษัท", "2025-10-02"],
  ],
  "The Monarch Residence": [
    ["เพิ่มลิฟต์แก้วโถงกลาง", "ลิฟต์โดยสารแบบพาโนรามา 3 ชั้น", 4.5, 3.4, 21, "pending", "ลูกค้า", "2026-10-25"],
  ],
  "Jewel of the Lake": [
    ["ท่าเทียบเรือส่วนตัว", "ท่าเรือไม้เต็งพร้อมศาลาริมน้ำ", 2.9, 2.1, 25, "approved", "ลูกค้า", "2025-12-15"],
    ["เปลี่ยนสีกระเบื้องหลังคา", "ลูกค้าขอเปลี่ยนสีหลังติดตั้งตัวอย่างหน้างาน", 0.6, 0.45, 5, "rejected", "ลูกค้า", "2026-07-08"],
  ],
  "Home-X One": [["ตู้ไวน์ติดผนังควบคุมอุณหภูมิ", "ตู้ไวน์ 240 ขวดพร้อมไฟ LED", 0.85, 0.6, 7, "approved", "ลูกค้า", "2026-06-20"]],
  "The Colonnade Palace": [["เพิ่มเสาโรมันและบัวปูนปั้นด้านหน้า", "ปรับด้านหน้าอาคารตามแบบที่ลูกค้าอนุมัติ", 3.2, 2.2, 20, "approved", "ลูกค้า", "2024-11-02"]],
}

function seedProject(row: (typeof rows)[number], index: number): Project {
  const [name, type, location, areaSqm, v, c, start, end, manager] = row
  const id = `PJ${String(index + 1).padStart(3, "0")}`
  const today = todayISO()
  // Seed progress follows the timeline (share of time elapsed), with some projects running a little behind
  const elapsed = differenceInCalendarDays(parseISO(today), parseISO(start)) / Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)))
  const progress = elapsed >= 1 ? 100 : Math.max(0, Math.min(99, Math.round(elapsed * 100 - (index % 3) * 4)))
  const phases = buildPhases(type, start, end, progress)
  const changeOrders: ChangeOrder[] = (seedChangeOrders[name] ?? []).map(([title, description, amt, cost, daysImpact, status, requestedBy, date], i) => ({
    id: `${id}-CO${i + 1}`,
    title,
    description,
    amount: amt * M,
    costImpact: cost * M,
    daysImpact,
    status,
    requestedBy,
    date,
    decidedDate: status === "pending" ? undefined : iso(addDays(parseISO(date), 6)),
  }))

  const installments = buildInstallments(id, type, v * M, phases).map((inst) => {
    if (!isTriggered(phases, inst, today)) return inst
    const paidDate = iso(addDays(parseISO(inst.dueDate), 10))
    return { ...inst, status: "paid" as const, paidDate: paidDate < today ? paidDate : today }
  })
  // Approved change orders with a price are billed as their own installment
  for (const co of changeOrders.filter((x) => x.status === "approved" && x.amount !== 0)) {
    const due = iso(addDays(parseISO(co.decidedDate!), 30))
    installments.push({
      id: `${id}-I-${co.id}`,
      title: co.amount > 0 ? `งานเพิ่ม: ${co.title}` : `ลดงาน: ${co.title}`,
      amount: co.amount,
      phase: null,
      atProgress: 0,
      dueDate: due,
      status: due < today ? "paid" : "invoiced",
      paidDate: due < today ? due : undefined,
      changeOrderId: co.id,
    })
  }
  // Leave the latest paid installment of some projects unpaid so overdue billing shows up
  if (index % 3 === 1) {
    const lastPaid = [...installments].reverse().find((i) => i.status === "paid" && !i.changeOrderId && i.phase !== null)
    if (lastPaid && progress < 100) Object.assign(lastPaid, { status: "invoiced", paidDate: undefined })
  }

  return {
    id,
    name,
    type,
    location,
    areaSqm,
    value: v * M,
    cost: c * M,
    start,
    end,
    manager,
    // Rough historical design effort: ~1.6 h per sqm for full design, scaled by progress
    priorHours: Math.round(areaSqm * (type === "construction" ? 0.4 : 1.6) * (progress / 100)),
    phases,
    installments,
    changeOrders,
  }
}

export const seedProjects: Project[] = rows.map(seedProject)

/** Annual billing target for 2569 (2026), cash basis. Placeholder. */
export const ANNUAL_TARGET = 620 * M

/** Sales pipeline (leads not yet signed). Placeholder until a CRM module exists. */
const pipelineStage = (key: string, count: number, value: number) => ({
  get stage() {
    return t(`projectLabels.pipeline.${key}`)
  },
  count,
  value,
})

export const pipeline = [
  pipelineStage("lead", 46, 0),
  pipelineStage("consultation", 28, 0),
  pipelineStage("concept", 14, 1320 * M),
  pipelineStage("quotation", 8, 905 * M),
  pipelineStage("signed", 3, 342 * M),
]
