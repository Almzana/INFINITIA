# ขึ้นระบบจริง (Production)

ใช้ไฟล์ compose 2 ไฟล์ร่วมกัน: `docker-compose.yml` (พื้นฐาน) + `docker-compose.prod.yml` (ค่าสำหรับใช้งานจริง)

สิ่งที่ `docker-compose.prod.yml` เปลี่ยนจากตอนพัฒนา:

| | พัฒนา (dev) | ใช้จริง (prod) |
|---|---|---|
| ทางเข้า | nginx ที่ `http://localhost:8080` | **Caddy** ที่ `https://<โดเมน>` ขอใบรับรอง Let's Encrypt อัตโนมัติ |
| ฐานข้อมูล | เปิดพอร์ต `127.0.0.1:5433` | ไม่เปิดพอร์ตออกนอก Docker เลย |
| อีเมล | Mailpit (ดูที่ `http://localhost:8025`) | SMTP ของบริษัท |
| ข้อมูลตัวอย่าง / บัญชีทดสอบ | ใส่ให้อัตโนมัติ | ไม่ใส่ (`RUN_SEED=false`) |
| Cookie | ส่งได้ทั้ง http | `Secure` (เฉพาะ https) |
| Backup | — | container `backup` ทำ `pg_dump` ทุกวัน เก็บ 14 วัน |

## 1. เตรียมเครื่อง server
- ติดตั้ง Docker + Docker Compose (v2.24 ขึ้นไป)
- ชี้ DNS ของโดเมน (เช่น `portal.infini-ia.com`) มาที่ IP ของ server
- เปิด firewall พอร์ต **80** และ **443** (Caddy ใช้ทั้งคู่ในการขอใบรับรอง)

## 2. ตั้งค่า `.env` (ที่โฟลเดอร์โปรเจกต์)
```env
POSTGRES_USER=hrportal
POSTGRES_PASSWORD=<รหัสยาวๆ สุ่มขึ้นมา>
POSTGRES_DB=hrportal

DOMAIN=portal.infini-ia.com
ACME_EMAIL=it@infini-ia.com          # Let's Encrypt แจ้งเตือนใบรับรองใกล้หมดอายุมาที่นี่

SMTP_HOST=smtp.your-mail-server.com  # ใช้ส่งอีเมลลืมรหัสผ่าน
SMTP_PORT=587
SMTP_USER=no-reply@infini-ia.com
SMTP_PASS=<รหัสอีเมล>
SMTP_FROM=INFINI I.A. Portal <no-reply@infini-ia.com>

BACKUP_AT=02:30                      # เวลาทำ backup (เวลาไทย)
BACKUP_KEEP_DAYS=14
```
ห้าม commit ไฟล์ `.env` (อยู่ใน `.gitignore` แล้ว)

## 3. เปิดระบบ
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
- migration ของฐานข้อมูลรันเองตอน `api` เริ่มทำงาน
- ครั้งแรก Caddy จะขอใบรับรอง ใช้เวลาไม่กี่วินาที แล้วเปิด `https://<โดเมน>` ได้เลย

## 4. สร้างผู้บริหารคนแรก
ระบบจริงไม่มีบัญชีทดสอบ และ**ห้ามรัน `seed.ts` บน production** (seed สร้างบัญชี demo ที่ใช้รหัสร่วมกัน รวมถึงบัญชี `dev` และข้อมูลพนักงานตัวอย่าง)
ให้สร้างบัญชีผู้บริหารคนแรกด้วยสคริปต์นี้ ระบบจะสุ่มรหัสชั่วคราวให้และแสดงครั้งเดียว:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api node scripts/create-admin.ts <username> <อีเมล> "<ชื่อที่แสดง>"
```
แล้ว login ด้วยรหัสชั่วคราวนั้น ระบบจะบังคับให้ตั้งรหัสใหม่ก่อนใช้งาน จากนั้นเพิ่มพนักงานและบัญชีอื่น ๆ ในหน้าพนักงาน

## 5. Backup และ Restore
- ไฟล์ backup อยู่ที่ `./backups/hrportal-YYYYMMDD-HHMMSS.dump` (รวมรูปโปรไฟล์ด้วย)
- **ต้องคัดลอกออกนอกเครื่องเป็นประจำ** (backup ที่อยู่เครื่องเดียวกับระบบ ถ้าดิสก์เสียก็หายไปพร้อมกัน) เช่นตั้ง cron:
  ```bash
  rclone sync ./backups remote:infini-portal-backups
  ```
- ดูว่า backup ทำงานไหม:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backup
  ```
- กู้คืน (แทนที่ข้อมูลปัจจุบันทั้งหมด):
  ```bash
  sh scripts/restore.sh backups/hrportal-20261031-023000.dump
  ```
- **ทดลอง restore ลงเครื่องทดสอบอย่างน้อยเดือนละครั้ง** — backup ที่ไม่เคยลองกู้ คือ backup ที่ไม่แน่ใจว่าใช้ได้

## 6. อัปเดตเวอร์ชัน
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## ทดสอบ HTTPS บนเครื่องตัวเอง (ไม่ต้องมีโดเมน)
```bash
DOMAIN=localhost ACME_EMAIL=test@example.com SMTP_HOST=smtp.example.com HTTP_PORT=8081 HTTPS_PORT=8443 \
  docker compose -p hrportal-prodtest -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
เปิด `https://localhost:8443` — เบราว์เซอร์จะเตือนเรื่องใบรับรอง เพราะ Caddy ใช้ CA ของตัวเองสำหรับ localhost (ปกติ)

## เอกสาร API (Swagger)

- เครื่องนักพัฒนา: http://localhost:5173/api/docs (หรือ http://localhost:8080/api/docs เมื่อรันด้วย Docker)
- ไฟล์ OpenAPI ดิบ: `/api/docs/json` (นำเข้า Postman/Insomnia ได้)
- กด "Try it out" ได้เลยหลัง login ในแท็บเดียวกัน (ใช้คุกกี้ `sid` ของเบราว์เซอร์)
- บน production ปิดไว้เป็นค่าเริ่มต้น ถ้าต้องการเปิด ให้ใส่ `API_DOCS_PROD=true` ใน `.env`

## Developer Console (หลังบ้านสำหรับนักพัฒนา)

- เปิดที่ `/dev` เช่น http://localhost:5173/dev หรือ http://localhost:8080/dev
- **ใช้ได้เฉพาะบัญชีนักพัฒนา** (ผู้บริหาร HR และพนักงานทั่วไปจะได้ 403) — ระบบสร้างบัญชี `dev` ให้ตอนรัน seed (รหัสผ่านเดียวกับบัญชี demo ใน `SEED_DEMO_PASSWORD`) บัญชีนี้มีสิทธิ์ระดับพนักงานทั่วไปเท่านั้น ไม่ผูกกับข้อมูลพนักงาน
- เข้าเมนูได้จากเมนูโปรไฟล์มุมซ้ายล่าง > Developer Console
- ให้/ถอนสิทธิ์บัญชีอื่น:
  - `npm run developer -- list` · `npm run developer -- grant <username>` · `npm run developer -- revoke <username>` (ในโฟลเดอร์ `server`)
  - ใน Docker: `docker compose exec api node scripts/developer.ts grant <username>`
- **ภาพรวม**: กด "รันทั้งหมด" เพื่อยิงทุกเส้น GET ที่ไม่ต้องใช้ id แล้วดูว่าเส้นไหนพัง (5xx) — เส้นที่แก้ข้อมูลจะไม่ถูกยิงอัตโนมัติ
- **Endpoints**: เลือกเส้นไหนก็ได้แล้วกรอก parameter/body ยิงทดสอบ ดู status เวลา และ response
- **Monitor**: สถิติทุกเส้นจากการใช้งานจริง (จำนวนครั้ง, 5xx, 4xx, เวลาเฉลี่ย) และ request ที่ล้มเหลวล่าสุดพร้อม error code
- ทุก request ทำงานด้วยสิทธิ์ของบัญชีที่ login อยู่ — login เป็น staff/HR/ผู้บริหาร เพื่อทดสอบสิทธิ์แต่ละ role ได้
- ใช้ได้ทุก environment รวม production (เฉพาะบัญชีนักพัฒนา) — ส่วน Swagger UI ยังเปิด/ปิดตาม `API_DOCS`
- **แจ้งเตือน 5xx:** เส้นไหนตอบ 5xx ระบบส่งกระดิ่งและอีเมลถึงบัญชีนักพัฒนาทุกคน (สูงสุด 1 ครั้งต่อเส้นทุก 10 นาที) — บน production ต้องตั้ง SMTP ให้อีเมลออกได้
- สถิติรายชั่วโมงเก็บในฐานข้อมูล 90 วัน และ 5xx เก็บ 30 วัน (ลบอัตโนมัติ) ไม่หายเมื่อรีสตาร์ท

## การลา: โควตาและวันหยุด (สำหรับ HR)

- หน้าการลา > **ตั้งค่าโควตา**: จำนวนวันต่อปีของแต่ละประเภท และเลือกได้ว่า "ห้ามเกิน" หรือไม่ (ค่าเริ่มต้นลาป่วยไม่ห้าม แค่แสดงว่าเกิน)
- โควตารายคน (เช่นอายุงานเยอะได้พักร้อนเพิ่ม): `PUT /api/leaves/quotas/<employeeId>` (ดูใน Swagger)
- **วันหยุดบริษัท** ไม่นับเป็นวันลา ระบบใส่วันหยุดที่วันที่ตายตัวของปี 2569–2570 ให้แล้ว **วันหยุดทางจันทรคติ (มาฆบูชา วิสาขบูชา อาสาฬหบูชา เข้าพรรษา) และวันหยุดชดเชยต้องเพิ่มเองทุกปี** ที่การ์ด "วันหยุดบริษัท" ในหน้าการลา
- ขั้นตอนอนุมัติ: พนักงานที่มีหัวหน้าทีม (Leader ที่มีบัญชี) → หัวหน้าอนุมัติก่อน → HR อนุมัติขั้นสุดท้าย / ไม่มีหัวหน้า → ไปที่ HR เลย / ผู้บริหารอนุมัติได้ทุกขั้น
