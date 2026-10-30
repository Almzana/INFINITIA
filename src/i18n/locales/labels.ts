// Status and type labels used across screens (see the label maps in src/data/mock.ts).
export const th = {
  "leaveType.sick": "ลาป่วย",
  "leaveType.vacation": "ลาพักร้อน",
  "leaveType.personal": "ลากิจ",
  "leaveType.maternity": "ลาคลอด",
  "employeeStatus.active": "ทำงานอยู่",
  "employeeStatus.probation": "ทดลองงาน",
  "employeeStatus.leave": "ลาพัก",
  "employeeStatus.resigned": "ลาออก",
  "leaveStatus.pending": "รออนุมัติ",
  "leaveStatus.approved": "อนุมัติแล้ว",
  "leaveStatus.rejected": "ไม่อนุมัติ",
}

export const en: Record<keyof typeof th, string> = {
  "leaveType.sick": "Sick leave",
  "leaveType.vacation": "Vacation leave",
  "leaveType.personal": "Personal leave",
  "leaveType.maternity": "Maternity leave",
  "employeeStatus.active": "Active",
  "employeeStatus.probation": "Probation",
  "employeeStatus.leave": "On leave",
  "employeeStatus.resigned": "Resigned",
  "leaveStatus.pending": "Pending",
  "leaveStatus.approved": "Approved",
  "leaveStatus.rejected": "Rejected",
}
