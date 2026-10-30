// Shared building blocks: pagination and the 404 page.
export const th = {
  "pager.totalPrefix": "ทั้งหมด",
  "pager.totalSuffix": "รายการ",
  "pager.perPage": "{n} / หน้า",
  "pager.prev": "หน้าก่อนหน้า",
  "pager.next": "หน้าถัดไป",
  "pager.goTo": "ไปที่",
  "pager.page": "หน้า",
  "notFound.title": "ไม่พบหน้าที่คุณต้องการ",
  "notFound.description": "หน้านี้อาจถูกย้ายหรือยังไม่เปิดใช้งาน",
  "notFound.backHome": "กลับหน้าแรก",
}

export const en: Record<keyof typeof th, string> = {
  "pager.totalPrefix": "Total",
  "pager.totalSuffix": "items",
  "pager.perPage": "{n} / page",
  "pager.prev": "Previous page",
  "pager.next": "Next page",
  "pager.goTo": "Go to",
  "pager.page": "",
  "notFound.title": "Page not found",
  "notFound.description": "This page may have moved or isn't available yet",
  "notFound.backHome": "Back to home",
}
