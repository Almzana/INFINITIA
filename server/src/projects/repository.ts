import { type Client, type Pool, withTx } from "../db.ts"
import { addDays, buildInstallments, buildPhases, isTriggered, type PhaseKey, type Phase, type ProjectType, todayISO } from "./logic.ts"

export interface ProjectInput {
  name: string
  type: ProjectType
  location: string
  areaSqm: number
  value: number
  cost: number
  start: string
  end: string
  manager: string
}

export interface ChangeOrderInput {
  title: string
  description: string
  amount: number
  costImpact: number
  daysImpact: number
  requestedBy: "ลูกค้า" | "บริษัท"
}

/**
 * A project with its phases, installments and change orders in ONE query
 * (json_agg per child table via the project_id indexes) — no per-project round trips.
 */
const SELECT = `
  SELECT p.id, p.name, p.type, p.location, p.area_sqm AS "areaSqm", p.value, p.cost,
         p.start_date AS start, p.end_date AS "end", p.manager, p.prior_hours AS "priorHours",
         p.created_by_user_id AS "createdByUserId",
         -- Members (employee ids): who may log hours on it
         COALESCE((SELECT array_agg(m.employee_id ORDER BY m.employee_id) FROM project_members m WHERE m.project_id = p.id), '{}') AS "memberIds",
         -- Hours logged in the timesheet, for costing (index time_entries_project_idx)
         COALESCE((SELECT sum(t.hours) FROM time_entries t WHERE t.project_id = p.id), 0)::float AS "loggedHours",
         COALESCE((SELECT json_agg(json_build_object('key', ph.key, 'start', ph.start_date, 'end', ph.end_date, 'progress', ph.progress) ORDER BY ph.position)
                     FROM project_phases ph WHERE ph.project_id = p.id), '[]') AS phases,
         COALESCE((SELECT json_agg(json_build_object('id', i.id, 'title', i.title, 'amount', i.amount, 'phase', i.phase, 'atProgress', i.at_progress,
                                                     'dueDate', i.due_date, 'status', i.status, 'paidDate', i.paid_date, 'changeOrderId', i.change_order_id) ORDER BY i.position)
                     FROM project_installments i WHERE i.project_id = p.id), '[]') AS installments,
         COALESCE((SELECT json_agg(json_build_object('id', c.id, 'title', c.title, 'description', c.description, 'amount', c.amount, 'costImpact', c.cost_impact,
                                                     'daysImpact', c.days_impact, 'status', c.status, 'requestedBy', c.requested_by, 'date', c.date, 'decidedDate', c.decided_date) ORDER BY c.date, c.id)
                     FROM project_change_orders c WHERE c.project_id = p.id), '[]') AS "changeOrders"
    FROM projects p`

/**
 * The warranty retention bills itself once every phase is done and its date (handover + 1 year) has
 * passed — usually long after anyone edits the project, so it is checked whenever projects are read.
 */
async function releaseDueRetention(db: Client | Pool) {
  await db.query(
    `UPDATE project_installments i SET status = 'invoiced'
      WHERE i.status = 'pending' AND i.phase IS NULL AND i.change_order_id IS NULL AND i.due_date <= $1
        AND NOT EXISTS (SELECT 1 FROM project_phases ph WHERE ph.project_id = i.project_id AND ph.progress < 100)`,
    [todayISO()],
  )
}

async function findOne(db: Client | Pool, id: string) {
  const { rows } = await db.query(`${SELECT} WHERE p.id = $1`, [id])
  return rows[0] ?? null
}

/** Pending installments whose trigger is now reached become invoiced. Returns their titles. */
async function autoInvoice(db: Client, projectId: string) {
  const { rows: phases } = await db.query<Phase>(
    `SELECT key, start_date AS start, end_date AS "end", progress FROM project_phases WHERE project_id = $1 ORDER BY position`,
    [projectId],
  )
  const { rows: pending } = await db.query<{ id: string; title: string; phase: PhaseKey | null; atProgress: number; dueDate: string; changeOrderId: string | null }>(
    `SELECT id, title, phase, at_progress AS "atProgress", due_date AS "dueDate", change_order_id AS "changeOrderId"
       FROM project_installments WHERE project_id = $1 AND status = 'pending'`,
    [projectId],
  )
  const billed = pending.filter((i) => isTriggered(phases, i))
  if (billed.length) await db.query("UPDATE project_installments SET status = 'invoiced' WHERE id = ANY($1)", [billed.map((b) => b.id)])
  return billed.map((b) => b.title)
}

export function createProjectRepository(pool: Pool) {
  return {
    async list() {
      await releaseDueRetention(pool)
      const { rows } = await pool.query(`${SELECT} ORDER BY p.id`)
      return rows
    },

    async findOne(id: string) {
      await releaseDueRetention(pool)
      return findOne(pool, id)
    },

    /** Creator's user id; null for imported projects; undefined when the project does not exist. */
    async createdBy(id: string) {
      const { rows } = await pool.query<{ c: string | null }>("SELECT created_by_user_id AS c FROM projects WHERE id = $1", [id])
      return rows[0] ? rows[0].c : undefined
    },

    /** Creates the project with its phase plan and payment schedule; the first installment is invoiced at once. */
    async create(input: ProjectInput, userId: string) {
      return withTx(pool, async (db) => {
        // Serialise id allocation (PJ001, PJ002, ...) between concurrent creates
        await db.query("SELECT pg_advisory_xact_lock(hashtext('projects_id'))")
        const { rows: maxRows } = await db.query<{ n: number }>("SELECT COALESCE(max(substring(id FROM 3)::int), 0) AS n FROM projects")
        const id = `PJ${String(maxRows[0].n + 1).padStart(3, "0")}`
        await db.query(
          `INSERT INTO projects (id, name, type, location, area_sqm, value, cost, start_date, end_date, manager, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [id, input.name, input.type, input.location, input.areaSqm, input.value, input.cost, input.start, input.end, input.manager, userId],
        )
        // The creator works on it (when their account has an employee record)
        await db.query("INSERT INTO project_members (project_id, employee_id) SELECT $1, e.id FROM employees e WHERE e.user_id = $2", [id, userId])
        const phases = buildPhases(input.type, input.start, input.end)
        await db.query(
          `INSERT INTO project_phases (project_id, key, position, start_date, end_date, progress)
           SELECT $1, key, position, start::date, "end"::date, 0
             FROM jsonb_to_recordset($2::jsonb) AS x(key text, position int, start text, "end" text)`,
          [id, JSON.stringify(phases.map((p, i) => ({ ...p, position: i + 1 })))],
        )
        const plan = buildInstallments(input.type, input.value, phases).map((p, i) => ({ ...p, id: `${id}-I${i + 1}`, position: i + 1 }))
        await db.query(
          `INSERT INTO project_installments (id, project_id, position, title, amount, phase, at_progress, due_date)
           SELECT id, $1, position, title, amount, phase, "atProgress", "dueDate"::date
             FROM jsonb_to_recordset($2::jsonb) AS x(id text, position int, title text, amount bigint, phase text, "atProgress" int, "dueDate" text)`,
          [id, JSON.stringify(plan)],
        )
        await autoInvoice(db, id)
        return findOne(db, id)
      })
    },

    async setPhaseProgress(id: string, phase: PhaseKey, progress: number) {
      return withTx(pool, async (db) => {
        const { rowCount } = await db.query("UPDATE project_phases SET progress = $3 WHERE project_id = $1 AND key = $2", [id, phase, progress])
        if (!rowCount) return null
        await db.query("UPDATE projects SET updated_at = now() WHERE id = $1", [id])
        const billed = await autoInvoice(db, id)
        return { project: await findOne(db, id), billed }
      })
    },

    async setInstallmentStatus(id: string, installmentId: string, status: "pending" | "invoiced" | "paid") {
      const { rowCount } = await pool.query(
        `UPDATE project_installments SET status = $3, paid_date = CASE WHEN $3 = 'paid' THEN current_date END
          WHERE project_id = $1 AND id = $2`,
        [id, installmentId, status],
      )
      return rowCount ? findOne(pool, id) : null
    },

    async addChangeOrder(id: string, co: ChangeOrderInput) {
      return withTx(pool, async (db) => {
        const { rows } = await db.query<{ n: number }>("SELECT (SELECT count(*) FROM project_change_orders WHERE project_id = p.id)::int AS n FROM projects p WHERE p.id = $1 FOR UPDATE", [id])
        if (!rows[0]) return null
        await db.query(
          `INSERT INTO project_change_orders (id, project_id, title, description, amount, cost_impact, days_impact, requested_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [`${id}-CO${rows[0].n + 1}`, id, co.title, co.description, co.amount, co.costImpact, co.daysImpact, co.requestedBy],
        )
        return findOne(db, id)
      })
    },

    /** Approving a priced change order bills it as its own invoiced installment, due in 30 days. */
    async decideChangeOrder(id: string, coId: string, status: "approved" | "rejected") {
      return withTx(pool, async (db) => {
        const { rows } = await db.query<{ title: string; amount: number }>(
          "SELECT title, amount FROM project_change_orders WHERE project_id = $1 AND id = $2 AND status = 'pending' FOR UPDATE",
          [id, coId],
        )
        const co = rows[0]
        if (!co) return null
        await db.query("UPDATE project_change_orders SET status = $2, decided_date = current_date WHERE id = $1", [coId, status])
        if (status === "approved" && co.amount !== 0) {
          await db.query(
            `INSERT INTO project_installments (id, project_id, position, title, amount, phase, at_progress, due_date, status, change_order_id)
             SELECT $1, $2, COALESCE(max(position), 0) + 1, $3, $4, NULL, 0, $5::date, 'invoiced', $6 FROM project_installments WHERE project_id = $2`,
            [`${id}-I-${coId}`, id, co.amount > 0 ? `งานเพิ่ม: ${co.title}` : `ลดงาน: ${co.title}`, co.amount, addDays(todayISO(), 30), coId],
          )
        }
        return findOne(db, id)
      })
    },
  }
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>
