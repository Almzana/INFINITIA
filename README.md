# INFINI I.A. — ระบบภายในองค์กร

React 19 + Vite + TypeScript + Tailwind CSS v4 + **shadcn/ui** ใช้โครงสร้างแบบ **Element Plus** และโทนสีแบรนด์ INFINI I.A. (น้ำตาลเข้มอมเทา / ทอป)

> Element Plus เป็นไลบรารีของ Vue จึงใช้ร่วมกับ React ตรงๆ ไม่ได้ โปรเจกต์นี้จึงใช้ shadcn/ui เป็นตัวหลัก
> แล้วนำ design token ของ Element Plus (สี #409EFF, success/warning/danger/info, el-tag, el-pagination, el-form-item) มาใช้แทน

## เริ่มใช้งาน

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build สำหรับ production ไว้ใน dist/
```

โหมดสาธิต: ล็อกอินด้วยอีเมลใดก็ได้ และรหัสผ่าน 4 ตัวขึ้นไป ข้อมูลทั้งหมดเก็บอยู่ใน localStorage ของเบราว์เซอร์
(กดรีเซ็ตได้ที่ ตั้งค่า → ระบบ)

## ฟีเจอร์

| หน้า | รายละเอียด |
| --- | --- |
| โครงการ | แผนเฟสงาน (Gantt) ปรับความคืบหน้าได้, งวดเงินตามประเภทงาน วางบิลอัตโนมัติเมื่อถึงเงื่อนไข, บันทึกรับเงิน, Change Order พร้อมอนุมัติ/ไม่อนุมัติ และสรุปกำไรรายโครงการ |
| บันทึกชั่วโมงงาน | Timesheet รายสัปดาห์แยกโครงการ/เฟส, คัดลอกสัปดาห์ก่อน, ภาพรวมทีม — ชั่วโมง × ฿750 เป็นต้นทุนแรงงานในกำไรโครงการ |
| แดชบอร์ดผู้บริหาร | คำนวณจากโมดูลโครงการ: มูลค่าสัญญารวม CO, กำไรหลังหักค่าแรง, รายรับตามงวดเงิน, งวดค้างชำระ, CO รออนุมัติ |
| เข้าสู่ระบบ | ตรวจสอบฟอร์ม, แสดง/ซ่อนรหัสผ่าน, redirect กลับหน้าเดิม |
| แดชบอร์ด | การ์ดสถิติ, กราฟ Area/Pie/Bar (Recharts), คำขอลารออนุมัติ, ห้องประชุมวันนี้, ประกาศ, ไทม์ไลน์กิจกรรม |
| พนักงาน | ฟอร์มค้นหาแบบ Element (ค้นหา/รีเซ็ต), ตารางเรียงลำดับได้, เลือกหลายแถว, ลบเป็นกลุ่ม, ส่งออก CSV (รองรับภาษาไทยใน Excel), เพิ่ม/แก้ไขผ่าน Dialog, ดูรายละเอียดผ่าน Sheet |
| การลา | วันลาคงเหลือ, แท็บตามสถานะ, อนุมัติ/ปฏิเสธทีละรายการหรือเป็นกลุ่ม, ยื่นใบลาด้วยปฏิทินเลือกช่วงวัน |
| จองห้องประชุม | ตารางเวลาแบบ timeline, คลิกช่องว่างเพื่อจองเร็ว, ตรวจเวลาชนกัน, ยกเลิกการจอง |
| ประกาศ | ค้นหา, กรองหมวดหมู่, ปักหมุด, สร้าง/ลบ |
| ตั้งค่า | โปรไฟล์, การแจ้งเตือน, ธีม สว่าง/มืด/ตามระบบ, รีเซ็ตข้อมูล |

ส่วนกลาง: Sidebar ย่อ/ขยายได้ (Ctrl+B), ค้นหาด้วย **Ctrl+K**, การแจ้งเตือน, Breadcrumb, Dark mode, Toast, responsive บนมือถือ, โหลดหน้าแบบ lazy

## โครงสร้าง

```
src/
├─ components/
│  ├─ ui/          # shadcn/ui (เพิ่มด้วย npx shadcn@latest add <name>)
│  ├─ layout/      # AppLayout, AppSidebar, CommandMenu, nav.ts (เมนู)
│  └─ shared/      # Tag (el-tag), ElPagination, FormItem, StatCard, PageHeader
├─ data/mock.ts    # ข้อมูลจำลอง
├─ lib/
│  ├─ store.tsx    # state กลาง (useReducer + localStorage) → เปลี่ยนเป็น API จริงได้ที่นี่
│  ├─ auth.tsx     # ระบบล็อกอินจำลอง → เชื่อม SSO / backend ที่นี่
│  ├─ theme.tsx    # dark/light mode
│  └─ format.ts    # วันที่แบบ พ.ศ., สกุลเงินบาท
├─ pages/          # หน้าต่างๆ
└─ index.css       # ธีมสี Element Plus (light + dark)
```

## ปรับแต่ง

- **สีหลัก**: แก้ `--primary` ใน `src/index.css`, ชื่อแบรนด์อยู่ใน `src/components/shared/brand.tsx`
- **เพิ่มเมนู**: เพิ่มใน `src/components/layout/nav.ts` แล้วเพิ่ม Route ใน `src/App.tsx`
- **ต่อ API จริง**: แทนที่ `dispatch(...)` ใน `src/lib/store.tsx` ด้วยการเรียก API (แนะนำ TanStack Query)
