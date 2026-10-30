// Department names are stored in Thai in the database. Keys are those stored values; use deptLabel(name).
export const th = {
  ฝ่ายบริหาร: "ฝ่ายบริหาร",
  ฝ่ายสถาปัตยกรรม: "ฝ่ายสถาปัตยกรรม",
  ฝ่ายออกแบบภายใน: "ฝ่ายออกแบบภายใน",
  ฝ่ายก่อสร้าง: "ฝ่ายก่อสร้าง",
  ฝ่ายบุคคล: "ฝ่ายบุคคล",
  ฝ่ายบัญชี: "ฝ่ายบัญชี",
  ฝ่ายการตลาด: "ฝ่ายการตลาด",
  ฝ่ายไอที: "ฝ่ายไอที",
}

export const en: Record<keyof typeof th, string> = {
  ฝ่ายบริหาร: "Management",
  ฝ่ายสถาปัตยกรรม: "Architecture",
  ฝ่ายออกแบบภายใน: "Interior Design",
  ฝ่ายก่อสร้าง: "Construction",
  ฝ่ายบุคคล: "Human Resources",
  ฝ่ายบัญชี: "Accounting",
  ฝ่ายการตลาด: "Marketing",
  ฝ่ายไอที: "IT",
}
