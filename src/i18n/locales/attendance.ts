// Attendance & turnover labels (HR dashboard placeholder data)
export const th = {
  "status.on-time": "ทำงานอยู่",
  "status.late": "มาสาย (ยังอยู่)",
  "status.left": "ออกงานแล้ว",
  "status.early-leave": "ออกก่อนเวลา",
  "status.leave": "ลา",
  "status.absent": "ขาดงาน",
  "reason.newJob": "ได้งานใหม่ / เงินเดือนสูงกว่า",
  "reason.study": "ศึกษาต่อ",
  "reason.relocation": "ย้ายภูมิลำเนา",
  "reason.family": "ภาระครอบครัว",
  "reason.probation": "ไม่ผ่านทดลองงาน",
  "reason.other": "อื่นๆ",
  "tenure.ym": "{y} ปี {m} เดือน",
  "tenure.m": "{m} เดือน",
}

export const en: Record<keyof typeof th, string> = {
  "status.on-time": "Working",
  "status.late": "Late (still in)",
  "status.left": "Clocked out",
  "status.early-leave": "Left early",
  "status.leave": "On leave",
  "status.absent": "Absent",
  "reason.newJob": "New job / higher pay",
  "reason.study": "Further study",
  "reason.relocation": "Relocation",
  "reason.family": "Family commitments",
  "reason.probation": "Did not pass probation",
  "reason.other": "Other",
  "tenure.ym": "{y} yr {m} mo",
  "tenure.m": "{m} mo",
}
