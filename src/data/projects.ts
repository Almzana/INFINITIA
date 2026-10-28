// Project names come from the public portfolio at infini-ia.com/portfolio.
// All financial figures, dates and progress are PLACEHOLDERS for the demo —
// replace them with data from the accounting / ERP system.

export type ProjectType = "design-build" | "architecture" | "interior" | "construction"
export type ProjectStatus = "completed" | "in-progress" | "design" | "handover"

export interface Project {
  id: string
  name: string
  type: ProjectType
  status: ProjectStatus
  location: string
  areaSqm: number
  /** Contract value (THB) */
  value: number
  /** Cost incurred / estimated at completion (THB) */
  cost: number
  /** Cash collected from the client so far (THB) */
  collected: number
  progress: number
  start: string
  end: string
  manager: string
}

export const projectTypeLabel: Record<ProjectType, string> = {
  "design-build": "ออกแบบ + ก่อสร้าง",
  architecture: "ออกแบบสถาปัตยกรรม",
  interior: "ออกแบบตกแต่งภายใน",
  construction: "ก่อสร้าง",
}

export const projectStatusLabel: Record<ProjectStatus, string> = {
  completed: "เสร็จสมบูรณ์",
  handover: "รอส่งมอบ",
  "in-progress": "กำลังก่อสร้าง",
  design: "อยู่ระหว่างออกแบบ",
}

const M = 1_000_000

// [name, type, status, location, area, value(M), cost(M), collected(M), progress, start, end, manager]
const rows: [string, ProjectType, ProjectStatus, string, number, number, number, number, number, string, string, string][] = [
  ["The Arcadia Residence", "design-build", "completed", "กรุงเทพฯ", 1450, 128, 92.2, 128, 100, "2023-03-01", "2025-02-28", "PM สมชาย"],
  ["Château Blanc Residence", "design-build", "completed", "นนทบุรี", 1200, 96.5, 71.4, 96.5, 100, "2023-06-15", "2025-05-30", "PM วิชัย"],
  ["The Sienna Manor", "design-build", "completed", "กรุงเทพฯ", 980, 74, 55.9, 74, 100, "2023-09-01", "2025-07-15", "PM สมชาย"],
  ["The Crown Residence", "design-build", "completed", "ปทุมธานี", 1600, 152, 113.8, 152, 100, "2023-11-01", "2025-10-31", "PM ธนพล"],
  ["The Colonnade Palace", "design-build", "completed", "กรุงเทพฯ", 2100, 186, 139.5, 186, 100, "2024-01-10", "2026-01-20", "PM วิชัย"],
  ["The Lumière Manor", "interior", "completed", "กรุงเทพฯ", 760, 38.5, 26.2, 38.5, 100, "2024-04-01", "2025-06-30", "ID อรุณี"],
  ["The Grandeur Mansion Residence", "design-build", "completed", "สมุทรปราการ", 1850, 164, 126.3, 164, 100, "2024-02-01", "2026-03-15", "PM ธนพล"],
  ["Timeless Sanctuary", "architecture", "completed", "เชียงใหม่", 640, 9.8, 6.1, 9.8, 100, "2024-06-01", "2025-03-31", "AR ณัฐวุฒิ"],
  ["The Portico Residence", "design-build", "completed", "กรุงเทพฯ", 1100, 88, 66.9, 88, 100, "2024-05-15", "2026-04-30", "PM สมชาย"],
  ["Jewel of the Lake", "design-build", "handover", "นครราชสีมา", 1380, 118, 89.7, 106.2, 96, "2024-08-01", "2026-11-30", "PM วิชัย"],
  ["The Crescent Residence", "interior", "completed", "กรุงเทพฯ", 820, 42, 29.8, 42, 100, "2025-01-10", "2026-02-28", "ID กมลชนก"],
  ["Noir Grandeur", "design-build", "in-progress", "กรุงเทพฯ", 1520, 142, 108.6, 85.2, 68, "2025-02-01", "2027-03-31", "PM ธนพล"],
  ["The Infinite Horizon", "design-build", "in-progress", "ชลบุรี", 1750, 158, 117.5, 79, 54, "2025-04-01", "2027-06-30", "PM สมชาย"],
  ["Golden Nakara", "design-build", "in-progress", "กรุงเทพฯ", 1300, 112, 86.1, 61.6, 61, "2025-03-15", "2027-01-31", "PM วิชัย"],
  ["The Obsidian Residence", "construction", "in-progress", "นนทบุรี", 1180, 84, 70.2, 37.8, 47, "2025-06-01", "2027-02-28", "PM ธนพล"],
  ["The Monarch Residence", "design-build", "in-progress", "กรุงเทพฯ", 1900, 176, 131.4, 70.4, 42, "2025-07-01", "2027-09-30", "PM สมชาย"],
  ["Vertigo Monarch", "architecture", "completed", "ภูเก็ต", 1250, 14.5, 9.4, 14.5, 100, "2025-01-15", "2025-12-15", "AR ณัฐวุฒิ"],
  ["Princess Château Residence", "design-build", "in-progress", "กรุงเทพฯ", 1650, 148, 112.9, 44.4, 33, "2025-09-01", "2027-11-30", "PM วิชัย"],
  ["Home-X One", "interior", "in-progress", "กรุงเทพฯ", 540, 24, 17.3, 12, 58, "2026-01-15", "2026-12-20", "ID อรุณี"],
  ["The Nature Embrace Residence", "design-build", "design", "เชียงใหม่", 1420, 126, 94.5, 12.6, 12, "2026-05-01", "2028-03-31", "AR ณัฐวุฒิ"],
  ["The Arches Manor Residence", "design-build", "design", "กรุงเทพฯ", 1580, 138, 103.5, 13.8, 8, "2026-07-01", "2028-05-31", "AR ปวีณา"],
  ["105 Residence", "interior", "design", "กรุงเทพฯ", 480, 19.5, 13.9, 3.9, 15, "2026-08-15", "2027-04-30", "ID กมลชนก"],
]

export const projects: Project[] = rows.map(([name, type, status, location, areaSqm, v, c, col, progress, start, end, manager], i) => ({
  id: `PJ${String(i + 1).padStart(3, "0")}`,
  name,
  type,
  status,
  location,
  areaSqm,
  value: v * M,
  cost: c * M,
  collected: col * M,
  progress,
  start,
  end,
  manager,
}))

export const profitOf = (p: Project) => p.value - p.cost
export const marginOf = (p: Project) => (p.value ? (p.value - p.cost) / p.value : 0)

/** Recognised revenue / cost per month for 2569 (2026), in THB. Placeholder figures. */
export const monthlyFinance = [
  { month: "ม.ค.", revenue: 58.2, cost: 43.6, target: 60 },
  { month: "ก.พ.", revenue: 61.5, cost: 45.1, target: 60 },
  { month: "มี.ค.", revenue: 72.8, cost: 52.9, target: 65 },
  { month: "เม.ย.", revenue: 54.3, cost: 41.7, target: 65 },
  { month: "พ.ค.", revenue: 68.9, cost: 50.2, target: 70 },
  { month: "มิ.ย.", revenue: 75.4, cost: 54.8, target: 70 },
  { month: "ก.ค.", revenue: 81.2, cost: 59.3, target: 75 },
  { month: "ส.ค.", revenue: 77.6, cost: 57.8, target: 75 },
  { month: "ก.ย.", revenue: 84.1, cost: 61.2, target: 80 },
  { month: "ต.ค.", revenue: 79.3, cost: 58.4, target: 80 },
].map((m) => ({ ...m, revenue: m.revenue * M, cost: m.cost * M, target: m.target * M, profit: (m.revenue - m.cost) * M }))

export const ANNUAL_TARGET = 850 * M

/** Sales pipeline (leads not yet signed). Placeholder figures. */
export const pipeline = [
  { stage: "ติดต่อเข้ามา", count: 46, value: 0 },
  { stage: "นัดปรึกษา", count: 28, value: 0 },
  { stage: "เสนอแบบร่าง", count: 14, value: 1320 * M },
  { stage: "เสนอราคา", count: 8, value: 905 * M },
  { stage: "เซ็นสัญญา", count: 3, value: 342 * M },
]
