// Mock data for the demo. Replace with real API calls (see src/lib/api.ts).

export type EmployeeStatus = "active" | "probation" | "leave" | "resigned"

export interface Employee {
  id: string
  code: string
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  department: string
  position: string
  status: EmployeeStatus
  startDate: string
  salary: number
}

export type LeaveType = "sick" | "vacation" | "personal" | "maternity"
export type LeaveStatus = "pending" | "approved" | "rejected"

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  from: string
  to: string
  days: number
  reason: string
  status: LeaveStatus
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  category: "ทั่วไป" | "HR" | "IT" | "กิจกรรม"
  pinned: boolean
  author: string
  date: string
}

export interface Room {
  id: string
  name: string
  capacity: number
  floor: number
  facilities: string[]
}

export interface Booking {
  id: string
  roomId: string
  title: string
  date: string
  start: string
  end: string
  owner: string
}

export const departments = [
  "ฝ่ายบริหาร",
  "ฝ่ายสถาปัตยกรรม",
  "ฝ่ายออกแบบภายใน",
  "ฝ่ายก่อสร้าง",
  "ฝ่ายบุคคล",
  "ฝ่ายบัญชี",
  "ฝ่ายการตลาด",
]

const positions: Record<string, string[]> = {
  ฝ่ายบริหาร: ["Managing Director", "Project Director", "เลขานุการ"],
  ฝ่ายสถาปัตยกรรม: ["Senior Architect", "Architect", "Junior Architect", "BIM Coordinator"],
  ฝ่ายออกแบบภายใน: ["Senior Interior Designer", "Interior Designer", "3D Visualizer", "FF&E Specialist"],
  ฝ่ายก่อสร้าง: ["Project Manager", "Site Engineer", "Foreman", "Quantity Surveyor"],
  ฝ่ายบุคคล: ["HR Manager", "HR Officer", "Recruiter"],
  ฝ่ายบัญชี: ["นักบัญชี", "ผู้จัดการฝ่ายบัญชี", "เจ้าหน้าที่จัดซื้อ"],
  ฝ่ายการตลาด: ["Marketing Executive", "Content Creator", "Sales Consultant"],
}

const firstNames = ["สมชาย", "สมหญิง", "วิชัย", "สุดา", "ประเสริฐ", "อรุณี", "ธนพล", "กมลชนก", "ณัฐวุฒิ", "พิมพ์ชนก", "ศุภชัย", "วรรณา", "อนุชา", "ปวีณา", "กิตติ", "จิราพร", "ภาณุ", "นันทนา", "ชยพล", "รัตนา"]
const lastNames = ["ใจดี", "รักไทย", "ศรีสุข", "มั่นคง", "วงศ์ใหญ่", "แสงทอง", "บุญมา", "ทองคำ", "พึ่งบุญ", "สุขสวัสดิ์", "เจริญผล", "ปัญญาดี"]
const nicknames = ["บอย", "แนน", "ต้น", "ฝน", "เอก", "มิ้นท์", "บีม", "ปุ้ย", "โอ๊ต", "แพร", "ตาล", "กอล์ฟ"]
const emailNames = ["somchai", "somying", "wichai", "suda", "prasert", "arunee", "thanapol", "kamonchanok", "nattawut", "pimchanok", "supachai", "wanna", "anucha", "paweena", "kitti", "jiraporn", "panu", "nantana", "chayapol", "rattana"]

// Deterministic pseudo-random so the demo looks the same every reload
function seeded(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}
const rand = seeded(42)
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]

const statuses: EmployeeStatus[] = ["active", "active", "active", "active", "active", "probation", "leave", "resigned"]

export const employees: Employee[] = Array.from({ length: 64 }, (_, i) => {
  const fi = Math.floor(rand() * firstNames.length)
  const dept = pick(departments)
  const year = 2015 + Math.floor(rand() * 11)
  const month = 1 + Math.floor(rand() * 12)
  return {
    id: String(i + 1),
    code: `EMP${String(1001 + i)}`,
    firstName: firstNames[fi],
    lastName: pick(lastNames),
    nickname: pick(nicknames),
    email: `${emailNames[fi]}.${i + 1}@infini-ia.com`,
    phone: `08${Math.floor(rand() * 10)}-${String(Math.floor(rand() * 900) + 100)}-${String(Math.floor(rand() * 9000) + 1000)}`,
    department: dept,
    position: pick(positions[dept]),
    status: pick(statuses),
    startDate: `${year}-${String(month).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
    salary: Math.round((18000 + rand() * 90000) / 500) * 500,
  }
})

const leaveTypes: LeaveType[] = ["sick", "vacation", "personal", "vacation", "sick"]
const reasons = ["ไม่สบาย มีไข้", "พาครอบครัวไปเที่ยว", "ติดธุระส่วนตัว", "ไปพบแพทย์ตามนัด", "งานบวชญาติ", "ทำธุระที่ราชการ", "พักผ่อนประจำปี"]
const leaveStatuses: LeaveStatus[] = ["pending", "pending", "approved", "approved", "approved", "rejected"]

export const leaveRequests: LeaveRequest[] = Array.from({ length: 28 }, (_, i) => {
  const day = 1 + Math.floor(rand() * 26)
  const days = 1 + Math.floor(rand() * 3)
  const month = 10 + Math.floor(rand() * 2)
  return {
    id: `LV${String(2401 + i)}`,
    employeeId: String(1 + Math.floor(rand() * 64)),
    type: pick(leaveTypes),
    from: `2026-${month}-${String(day).padStart(2, "0")}`,
    to: `2026-${month}-${String(day + days - 1).padStart(2, "0")}`,
    days,
    reason: pick(reasons),
    status: i < 6 ? "pending" : pick(leaveStatuses),
    createdAt: `2026-10-${String(Math.max(1, day - 3)).padStart(2, "0")}`,
  }
})

export const announcements: Announcement[] = [
  { id: "1", title: "วันหยุดประจำปี 2027", body: "ฝ่ายบุคคลประกาศวันหยุดประจำปี 2027 รวมทั้งสิ้น 16 วัน ดูรายละเอียดและวางแผนการลาได้ในระบบ", category: "HR", pinned: true, author: "ฝ่ายบุคคล", date: "2026-10-25" },
  { id: "2", title: "ปิดปรับปรุงระบบอีเมล คืนวันเสาร์นี้", body: "ระบบอีเมลจะปิดปรับปรุงเวลา 22:00–02:00 น. ในวันเสาร์ที่ 31 ต.ค. ขออภัยในความไม่สะดวก", category: "IT", pinned: true, author: "ฝ่ายไอที", date: "2026-10-27" },
  { id: "3", title: "งานเลี้ยงปีใหม่ 2027", body: "ขอเชิญพนักงานทุกท่านร่วมงานเลี้ยงปีใหม่ ธีม \"Retro Thai\" ลงทะเบียนได้ถึง 30 พ.ย.", category: "กิจกรรม", pinned: false, author: "คณะกรรมการสวัสดิการ", date: "2026-10-20" },
  { id: "4", title: "อัปเดตนโยบายการทำงานแบบ Hybrid", body: "พนักงานสามารถทำงานจากที่บ้านได้สูงสุด 2 วันต่อสัปดาห์ โดยแจ้งหัวหน้างานล่วงหน้า", category: "HR", pinned: false, author: "ฝ่ายบุคคล", date: "2026-10-15" },
  { id: "5", title: "ตรวจสุขภาพประจำปี", body: "โรงพยาบาลจะเข้ามาตรวจสุขภาพที่ชั้น 5 วันที่ 12–13 พ.ย. กรุณาลงชื่อเลือกช่วงเวลา", category: "ทั่วไป", pinned: false, author: "ฝ่ายบุคคล", date: "2026-10-10" },
  { id: "6", title: "เปลี่ยนรหัสผ่าน VPN ภายในสิ้นเดือน", body: "เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่าน VPN ภายในวันที่ 31 ต.ค.", category: "IT", pinned: false, author: "ฝ่ายไอที", date: "2026-10-05" },
]

export const rooms: Room[] = [
  { id: "r1", name: "ห้องเจ้าพระยา", capacity: 20, floor: 5, facilities: ["โปรเจกเตอร์", "VDO Conference", "ไวท์บอร์ด"] },
  { id: "r2", name: "ห้องปิง", capacity: 8, floor: 3, facilities: ["ทีวี", "ไวท์บอร์ด"] },
  { id: "r3", name: "ห้องวัง", capacity: 6, floor: 3, facilities: ["ทีวี"] },
  { id: "r4", name: "ห้องยม", capacity: 12, floor: 4, facilities: ["โปรเจกเตอร์", "ไวท์บอร์ด"] },
  { id: "r5", name: "ห้องน่าน", capacity: 4, floor: 4, facilities: ["ทีวี", "VDO Conference"] },
]

export const bookings: Booking[] = [
  { id: "b1", roomId: "r1", title: "ประชุมติดตามโครงการประจำเดือน", date: "2026-10-28", start: "09:00", end: "11:00", owner: "Project Director" },
  { id: "b2", roomId: "r2", title: "Design Review โครงการบ้านพักอากาศ", date: "2026-10-28", start: "10:00", end: "11:30", owner: "ทีมออกแบบภายใน" },
  { id: "b3", roomId: "r4", title: "สัมภาษณ์สถาปนิก", date: "2026-10-28", start: "13:00", end: "14:00", owner: "ฝ่ายบุคคล" },
  { id: "b4", roomId: "r1", title: "อบรม Revit / BIM", date: "2026-10-28", start: "14:00", end: "16:30", owner: "ฝ่ายสถาปัตยกรรม" },
  { id: "b5", roomId: "r3", title: "1:1 Meeting", date: "2026-10-28", start: "15:00", end: "15:30", owner: "Senior Architect" },
  { id: "b6", roomId: "r5", title: "ประชุมผู้รับเหมา", date: "2026-10-28", start: "11:00", end: "12:00", owner: "ฝ่ายก่อสร้าง" },
  { id: "b7", roomId: "r2", title: "นำเสนอแบบลูกค้า", date: "2026-10-29", start: "09:30", end: "10:30", owner: "ฝ่ายการตลาด" },
]

export const headcountTrend = [
  { month: "พ.ค.", headcount: 52, hires: 3, exits: 1 },
  { month: "มิ.ย.", headcount: 54, hires: 4, exits: 2 },
  { month: "ก.ค.", headcount: 55, hires: 2, exits: 1 },
  { month: "ส.ค.", headcount: 58, hires: 5, exits: 2 },
  { month: "ก.ย.", headcount: 61, hires: 4, exits: 1 },
  { month: "ต.ค.", headcount: 64, hires: 4, exits: 1 },
]

export const activities = [
  { id: 1, who: "สุดา แสงทอง", what: "ยื่นใบลาพักร้อน 3 วัน", when: "5 นาทีที่แล้ว", type: "leave" },
  { id: 2, who: "ฝ่ายไอที", what: "เผยแพร่ประกาศใหม่: ปิดปรับปรุงระบบอีเมล", when: "1 ชั่วโมงที่แล้ว", type: "announce" },
  { id: 3, who: "วิชัย มั่นคง", what: "จองห้องเจ้าพระยา 14:00–16:30", when: "2 ชั่วโมงที่แล้ว", type: "room" },
  { id: 4, who: "HR Officer", what: "เพิ่มพนักงานใหม่ 2 คนในฝ่ายขาย", when: "เมื่อวาน", type: "employee" },
  { id: 5, who: "ธนพล บุญมา", what: "ได้รับอนุมัติลาป่วย 1 วัน", when: "เมื่อวาน", type: "leave" },
]

export const leaveTypeLabel: Record<LeaveType, string> = {
  sick: "ลาป่วย",
  vacation: "ลาพักร้อน",
  personal: "ลากิจ",
  maternity: "ลาคลอด",
}

export const employeeStatusLabel: Record<EmployeeStatus, string> = {
  active: "ทำงานอยู่",
  probation: "ทดลองงาน",
  leave: "ลาพัก",
  resigned: "ลาออก",
}

export const leaveStatusLabel: Record<LeaveStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
}
