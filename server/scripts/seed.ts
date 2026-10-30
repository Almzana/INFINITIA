// Demo data for development: users, imported employees, projects, leave, meetings, tasks. Runs once per
// database (see app_meta below); never run it on production — use scripts/create-admin.ts there.
import { readFile } from "node:fs/promises"
import { hashPassword } from "../src/auth/password.ts"
import { createPool, withTx } from "../src/db.ts"
import { addDays, todayISO } from "../src/projects/logic.ts"

const url = process.env.DATABASE_URL
if (!url) throw new Error("Missing required env var DATABASE_URL")
// Demo accounts share one password, kept in .env (never in source)
const demoPassword = process.env.SEED_DEMO_PASSWORD

const pool = createPool(url)

// Demo data is created once per database. Re-running it on every container start (RUN_SEED=true)
// would bring back demo accounts and records that were deleted on purpose. SEED_ALWAYS=true
// (used by the test suite) runs it anyway; deleting the app_meta row allows a fresh run.
const { rowCount: alreadySeeded } = await pool.query("SELECT 1 FROM app_meta WHERE key = 'demo_seeded'")
if (alreadySeeded && process.env.SEED_ALWAYS !== "true") {
  console.log("demo data was already seeded once; skipping")
  await pool.end()
  process.exit(0)
}

const users = [
  { username: "admin", email: "admin@infini-ia.com", name: "ผู้บริหาร", role: "executive", department: "ฝ่ายบริหาร", is_developer: false },
  { username: "hr", email: "hr@infini-ia.com", name: "HR Manager", role: "hr", department: "ฝ่ายบุคคล", is_developer: false },
  { username: "staff", email: "staff@infini-ia.com", name: "พนักงานทั่วไป", role: "staff", department: "ฝ่ายออกแบบภายใน", is_developer: false },
  // Dedicated Developer Console account: lowest business role, no employee record, console access only
  { username: "dev", email: "dev@infini-ia.com", name: "Developer", role: "staff", department: "ฝ่ายไอที", is_developer: true },
]

if (!demoPassword) {
  console.warn("SEED_DEMO_PASSWORD is not set, skipping demo users")
} else {
  const hashes = await Promise.all(users.map(() => hashPassword(demoPassword)))
  const rows = users.map((u, i) => ({ ...u, password_hash: hashes[i] }))
  const { rowCount } = await pool.query(
    `INSERT INTO users (username, email, name, role, department, is_developer, password_hash)
     SELECT username, email, name, role, department, is_developer, password_hash
       FROM jsonb_to_recordset($1::jsonb) AS u(username text, email text, name text, role text, department text, is_developer boolean, password_hash text)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(rows)],
  )
  console.log(`seeded ${rowCount} demo users`)
}

// Employees exported from the frontend's former mock data; ids are kept so leaves/timesheets still match
const employees = JSON.parse(await readFile(new URL("./data/employees.json", import.meta.url), "utf8"))
const { rowCount: importedEmployees } = await pool.query(
  `INSERT INTO employees (id, code, first_name, last_name, nickname, email, phone, department, position, status, start_date, salary)
   SELECT id, code, "firstName", "lastName", nickname, lower(email), phone, department, position, status, "startDate"::date, salary
     FROM jsonb_to_recordset($1::jsonb) AS e(id text, code text, "firstName" text, "lastName" text, nickname text, email text,
          phone text, department text, position text, status text, "startDate" text, salary int)
   ON CONFLICT DO NOTHING`,
  [JSON.stringify(employees)],
)
console.log(`imported ${importedEmployees} employees`)

// Every demo account is also an employee (so it can have a team). Only links accounts that have no record yet.
const demoEmployees = [
  { username: "admin", code: "EMP0001", first: "อนันต์", last: "วัฒนกุล", dept: "ฝ่ายบริหาร", position: "Managing Director" },
  { username: "hr", code: "EMP0002", first: "สุภาพร", last: "ใจงาม", dept: "ฝ่ายบุคคล", position: "HR Manager" },
  // A Developer by title who also leads a small team (the Leader case)
  { username: "staff", code: "EMP0003", first: "ธนา", last: "ศรีพัฒน์", dept: "ฝ่ายสถาปัตยกรรม", position: "BIM Developer" },
]
const { rowCount: linked } = await pool.query(
  `WITH linked AS (
     INSERT INTO employees (code, first_name, last_name, email, department, position, status, start_date, user_id)
     SELECT d.code, d.first, d.last, u.email, d.dept, d.position, 'active', DATE '2020-01-06', u.id
       FROM jsonb_to_recordset($1::jsonb) AS d(username text, code text, first text, last text, dept text, position text)
       JOIN users u ON u.username = d.username
      WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id)
     ON CONFLICT DO NOTHING
     RETURNING user_id, first_name, last_name, department
   )
   UPDATE users u SET name = l.first_name || ' ' || l.last_name, department = l.department FROM linked l WHERE u.id = l.user_id`,
  [JSON.stringify(demoEmployees)],
)
console.log(`linked ${linked} demo accounts to employee records`)

// Demo team: if nobody has a leader yet, three architecture staff report to the "staff" demo account
const { rowCount: teamSize } = await pool.query(
  `UPDATE employees SET manager_id = (SELECT e.id FROM employees e JOIN users u ON u.id = e.user_id WHERE u.username = 'staff')
    WHERE id IN (
      SELECT id FROM employees
       WHERE department = 'ฝ่ายสถาปัตยกรรม' AND status <> 'resigned' AND user_id IS NULL
       ORDER BY code LIMIT 3)
      AND NOT EXISTS (SELECT 1 FROM employees WHERE manager_id IS NOT NULL)`,
)
console.log(`assigned ${teamSize} team members`)

// Announcements from the former mock data, only into an empty table
const { rows: annCount } = await pool.query<{ n: string }>("SELECT count(*) AS n FROM announcements")
if (Number(annCount[0].n) === 0) {
  const anns = JSON.parse(await readFile(new URL("./data/announcements.json", import.meta.url), "utf8"))
  const { rowCount } = await pool.query(
    `INSERT INTO announcements (title, body, category, pinned, author_name, date)
     SELECT title, body, category, pinned, author, date::date
       FROM jsonb_to_recordset($1::jsonb) AS a(title text, body text, category text, pinned boolean, author text, date text)`,
    [JSON.stringify(anns)],
  )
  console.log(`seeded ${rowCount} announcements`)
}

// Projects (with phases, change orders, installments) from the former mock data, only into an empty table.
// Each child table is filled by one set-based INSERT over the JSON, not row by row.
const { rows: projCount } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM projects")
if (projCount[0].n === 0) {
  const projects = await readFile(new URL("./data/projects.json", import.meta.url), "utf8")
  const rowCount = await withTx(pool, async (db) => {
  await db.query(
    `INSERT INTO projects (id, name, type, location, area_sqm, value, cost, start_date, end_date, manager, prior_hours)
     SELECT id, name, type, location, "areaSqm", round(value)::bigint, round(cost)::bigint, start::date, "end"::date, manager, "priorHours"
       FROM jsonb_to_recordset($1::jsonb) AS p(id text, name text, type text, location text, "areaSqm" int, value numeric, cost numeric,
            start text, "end" text, manager text, "priorHours" int)`,
    [projects],
  )
  await db.query(
    `INSERT INTO project_phases (project_id, key, position, start_date, end_date, progress)
     SELECT p->>'id', ph->>'key', ord, (ph->>'start')::date, (ph->>'end')::date, (ph->>'progress')::int
       FROM jsonb_array_elements($1::jsonb) p, jsonb_array_elements(p->'phases') WITH ORDINALITY AS x(ph, ord)`,
    [projects],
  )
  await db.query(
    `INSERT INTO project_change_orders (id, project_id, title, description, amount, cost_impact, days_impact, status, requested_by, date, decided_date)
     SELECT c->>'id', p->>'id', c->>'title', COALESCE(c->>'description', ''), round((c->>'amount')::numeric)::bigint, round((c->>'costImpact')::numeric)::bigint,
            (c->>'daysImpact')::int, c->>'status', c->>'requestedBy', (c->>'date')::date, (c->>'decidedDate')::date
       FROM jsonb_array_elements($1::jsonb) p, jsonb_array_elements(p->'changeOrders') c`,
    [projects],
  )
  const res = await db.query(
    `INSERT INTO project_installments (id, project_id, position, title, amount, phase, at_progress, due_date, status, paid_date, change_order_id)
     SELECT i->>'id', p->>'id', ord, i->>'title', round((i->>'amount')::numeric)::bigint, i->>'phase', (i->>'atProgress')::int, (i->>'dueDate')::date,
            i->>'status', (i->>'paidDate')::date, i->>'changeOrderId'
       FROM jsonb_array_elements($1::jsonb) p, jsonb_array_elements(p->'installments') WITH ORDINALITY AS x(i, ord)`,
    [projects],
  )
  return res.rowCount
  })
  console.log(`seeded projects with ${rowCount} installments`)
}

// Leave requests and timesheet entries from the former mock data, each only into an empty table
const { rows: leaveCount } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM leave_requests")
if (leaveCount[0].n === 0) {
  const { rowCount } = await pool.query(
    // Pending requests wait for HR (the two-step stage column must be set for every pending row)
    `INSERT INTO leave_requests (id, employee_id, type, from_date, to_date, days, reason, status, stage, created_at)
     SELECT l.id, l."employeeId", l.type, l."from"::date, l."to"::date, l.days, l.reason, l.status,
            CASE WHEN l.status = 'pending' THEN 'hr' END, l."createdAt"::date
       FROM jsonb_to_recordset($1::jsonb) AS l(id text, "employeeId" text, type text, "from" text, "to" text, days int, reason text, status text, "createdAt" text)
       JOIN employees e ON e.id = l."employeeId"`,
    [await readFile(new URL("./data/leaves.json", import.meta.url), "utf8")],
  )
  console.log(`seeded ${rowCount} leave requests`)
}
const { rows: timeCount } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM time_entries")
if (timeCount[0].n === 0) {
  const { rowCount } = await pool.query(
    `INSERT INTO time_entries (employee_id, project_id, phase, date, hours)
     SELECT t."employeeId", t."projectId", t.phase, t.date::date, t.hours
       FROM jsonb_to_recordset($1::jsonb) AS t("employeeId" text, "projectId" text, phase text, date text, hours numeric)
       JOIN employees e ON e.id = t."employeeId" JOIN projects p ON p.id = t."projectId"`,
    [await readFile(new URL("./data/timesheet.json", import.meta.url), "utf8")],
  )
  console.log(`seeded ${rowCount} time entries`)
}

// Meeting rooms (ids kept from the former mock data)
const rooms = JSON.parse(await readFile(new URL("./data/rooms.json", import.meta.url), "utf8"))
const { rowCount: importedRooms } = await pool.query(
  `INSERT INTO rooms (id, name, capacity, floor, facilities)
   SELECT id, name, capacity, floor, ARRAY(SELECT jsonb_array_elements_text(facilities))
     FROM jsonb_to_recordset($1::jsonb) AS r(id text, name text, capacity int, floor int, facilities jsonb)
   ON CONFLICT DO NOTHING`,
  [JSON.stringify(rooms)],
)
console.log(`imported ${importedRooms} rooms`)

// Demo meetings around today, only into an empty table
const { rows: meetingCount } = await pool.query<{ n: string }>("SELECT count(*) AS n FROM meetings")
if (Number(meetingCount[0].n) === 0) {
  // [room, title, dayOffset, start, end, organizer, agenda]
  const demo = [
    ["r1", "ประชุมติดตามโครงการประจำเดือน", 0, "09:00", "11:00", "Project Director", "1. สรุปความคืบหน้าทุกโครงการ\n2. งวดเงินที่ใกล้ครบกำหนด\n3. ปัญหาหน้างาน"],
    ["r2", "Design Review โครงการบ้านพักอากาศ", 0, "10:00", "11:30", "ทีมออกแบบภายใน", "รีวิวแบบ Schematic และวัสดุตกแต่ง"],
    ["r4", "สัมภาษณ์สถาปนิก", 0, "13:00", "14:00", "ฝ่ายบุคคล", null],
    ["r1", "อบรม Revit / BIM", 0, "14:00", "16:30", "ฝ่ายสถาปัตยกรรม", null],
    ["r3", "1:1 Meeting", 0, "15:00", "15:30", "Senior Architect", null],
    ["r5", "ประชุมผู้รับเหมา", 0, "11:00", "12:00", "ฝ่ายก่อสร้าง", "ตรวจรับงานโครงสร้างชั้น 2"],
    ["r2", "นำเสนอแบบลูกค้า", 1, "09:30", "10:30", "ฝ่ายการตลาด", null],
  ] as const
  const rowsJson = demo.map(([room, title, offset, start, end, organizer, agenda]) => ({ room, title, date: addDays(todayISO(), offset), start, end, organizer, agenda }))
  const { rowCount } = await pool.query(
    `INSERT INTO meetings (room_id, title, date, start_time, end_time, organizer_name, agenda)
     SELECT room, title, date::date, start::time, "end"::time, organizer, agenda
       FROM jsonb_to_recordset($1::jsonb) AS m(room text, title text, date text, start text, "end" text, organizer text, agenda text)`,
    [JSON.stringify(rowsJson)],
  )
  console.log(`seeded ${rowCount} meetings`)
}

// Relative to today in Bangkok (not UTC)
const day = (offset: number) => addDays(todayISO(), offset)

const me = "admin@infini-ia.com"
// [title, description, assignee, dueInDays, priority, status, projectId]
const rows: [string, string | null, string, number | null, string, string, string | null][] = [
  ["ส่งแบบ Schematic ให้ลูกค้ารีวิว", "รวมผังพื้นและรูปด้านทั้ง 4 ด้าน", me, 0, "high", "todo", null],
  ["กรอก Timesheet สัปดาห์นี้", null, me, 1, "medium", "todo", null],
  ["ประชุมทีมออกแบบภายใน", "ห้องประชุม A ชั้น 3", me, 2, "medium", "todo", null],
  ["ตรวจใบเสนอราคาวัสดุตกแต่ง", "เทียบราคา 3 ร้าน", me, 5, "low", "todo", null],
  ["อัปเดต BOQ งานระบบไฟฟ้า", null, me, -1, "high", "todo", null],
  ["ส่งรายงานความคืบหน้าประจำเดือน", null, me, -3, "medium", "done", null],
  ["สรุปผลสัมภาษณ์ตำแหน่งสถาปนิก", null, "hr@infini-ia.com", 1, "high", "todo", null],
  ["อนุมัติใบลาที่ค้างอยู่", null, "hr@infini-ia.com", 0, "medium", "todo", null],
  ["เขียนแบบรายละเอียดเคาน์เตอร์ครัว", null, "staff@infini-ia.com", 2, "high", "todo", null],
  ["ส่งตัวอย่างวัสดุให้หัวหน้าทีม", null, "staff@infini-ia.com", 3, "low", "todo", null],
]

const client = await pool.connect()
try {
  const { rows: existing } = await client.query<{ n: string }>("SELECT count(*) AS n FROM tasks")
  if (Number(existing[0].n) > 0) {
    console.log("tasks table already has data, skipping seed")
  } else {
    await client.query("BEGIN")
    // Single multi-row INSERT instead of one query per row
    const values: unknown[] = []
    const tuples = rows.map(([title, desc, email, due, priority, status, project], i) => {
      values.push(title, desc, email, due === null ? null : day(due), priority, status, project)
      const b = i * 7
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`
    })
    await client.query(
      `INSERT INTO tasks (title, description, assignee_email, due_date, priority, status, project_id) VALUES ${tuples.join(", ")}`,
      values,
    )
    await client.query("COMMIT")
    console.log(`seeded ${rows.length} tasks`)
  }
  // Everything above succeeded: remember it (only when demo accounts could be created)
  if (demoPassword) await client.query("INSERT INTO app_meta (key, value) VALUES ('demo_seeded', now()::text) ON CONFLICT (key) DO NOTHING")
} catch (err) {
  await client.query("ROLLBACK").catch(() => {})
  throw err
} finally {
  client.release()
  await pool.end()
}
