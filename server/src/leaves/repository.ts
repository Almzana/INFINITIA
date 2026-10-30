import type { Role } from "../auth/repository.ts"
import { type Pool, withTx } from "../db.ts"
import { HOLIDAY_LOCK, holidaysBetween, quotaFor } from "./quota-repository.ts"

export type LeaveType = "sick" | "vacation" | "personal" | "maternity"
export type LeaveStatus = "pending" | "approved" | "rejected"

/** Who is looking: decides which requests they see and may decide. */
export interface Viewer {
  userId: string
  employeeId: string | null
  role: Role
}

// v = viewer employee id, r = viewer role, u = viewer user id. May decide: never their own request;
// executives at any stage; the Leader named on the request at the Leader stage; HR at the HR stage
// unless they already approved it as its Leader (two steps need two people); HR also at the Leader
// stage when that Leader can no longer act (resigned, removed, or without an account).
const canDecide = (v: string, r: string, u: string) => `(l.status = 'pending' AND l.employee_id IS DISTINCT FROM ${v} AND (
    ${r} = 'executive'
    OR (l.stage = 'leader' AND l.approver_employee_id = ${v})
    OR (l.stage = 'hr' AND ${r} = 'hr' AND l.leader_decided_by_user_id IS DISTINCT FROM ${u})
    OR (l.stage = 'leader' AND ${r} = 'hr' AND NOT EXISTS (
          SELECT 1 FROM employees m WHERE m.id = l.approver_employee_id AND m.status <> 'resigned' AND m.user_id IS NOT NULL))))`

const columns = (v: string, r: string, u: string) => `l.id, l.employee_id AS "employeeId", l.type, l.from_date AS "from", l.to_date AS "to", l.days,
  l.reason, l.status, l.stage, l.approver_employee_id AS "approverEmployeeId", l.created_at AS "createdAt", ${canDecide(v, r, u)} AS "canDecide"`

/** Working days (Mon–Fri, not a company holiday) between two ISO dates, inclusive. */
export function workingDays(from: string, to: string, holidays: Set<string> = new Set()) {
  let n = 0
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    const d = new Date(t)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6 && !holidays.has(d.toISOString().slice(0, 10))) n++
  }
  return n
}

export type CreateResult =
  | { kind: "created"; leave: Record<string, unknown> & { id: string; type: string; from: string; to: string; days: number; stage: "leader" | "hr"; approverEmployeeId: string | null } }
  | { kind: "no-working-days" }
  | { kind: "overlap" }
  | { kind: "quota"; quota: number; taken: number }

export function createLeaveRepository(pool: Pool) {
  return {
    /**
     * HR and executives see every request; everyone else sees their own plus the ones waiting
     * (or once waiting) for them as Leader. Newest first, one query incl. total.
     */
    async list(viewer: Viewer, opts: { status?: LeaveStatus; page: number; pageSize: number }) {
      const params: unknown[] = [viewer.employeeId, viewer.role, viewer.userId]
      const where: string[] = []
      if (viewer.role === "staff") where.push("(l.employee_id = $1 OR l.approver_employee_id = $1)")
      if (opts.status) where.push(`l.status = $${params.push(opts.status)}`)
      params.push(opts.pageSize, (opts.page - 1) * opts.pageSize)
      const { rows } = await pool.query(
        `SELECT ${columns("$1::text", "$2::text", "$3::uuid")}, count(*) OVER() AS total FROM leave_requests l
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY l.created_at DESC, l.from_date DESC, l.id DESC
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return { items: rows.map(({ total: _t, ...l }) => l), total: rows.length ? Number(rows[0].total) : 0 }
    },

    /**
     * Counts working days (holidays excluded), refuses overlaps and requests over an enforced quota,
     * picks the Leader stage when the requester has an active Leader with an account — all under a
     * lock on the employee row so two concurrent requests cannot both pass the checks.
     */
    async create(employeeId: string, viewer: Viewer, input: { type: LeaveType; from: string; to: string; reason: string }): Promise<CreateResult> {
      return withTx(pool, async (db) => {
        await db.query("SELECT 1 FROM employees WHERE id = $1 FOR UPDATE", [employeeId])
        // A holiday added meanwhile would otherwise be counted here and missed by its recount
        await db.query(`SELECT pg_advisory_xact_lock_shared(${HOLIDAY_LOCK})`)
        const days = workingDays(input.from, input.to, await holidaysBetween(db, input.from, input.to))
        if (days === 0) return { kind: "no-working-days" }
        const { rowCount } = await db.query(
          `SELECT 1 FROM leave_requests WHERE employee_id = $1 AND status <> 'rejected' AND from_date <= $3 AND to_date >= $2`,
          [employeeId, input.from, input.to],
        )
        if (rowCount) return { kind: "overlap" }
        const q = await quotaFor(db, employeeId, input.type, Number(input.from.slice(0, 4)))
        if (q.enforce && q.taken + days > q.quota) return { kind: "quota", quota: q.quota, taken: q.taken }
        const leader = await db.query<{ id: string }>(
          `SELECT m.id FROM employees e JOIN employees m ON m.id = e.manager_id
            WHERE e.id = $1 AND m.status <> 'resigned' AND m.user_id IS NOT NULL`,
          [employeeId],
        )
        const approver = leader.rows[0]?.id ?? null
        const { rows } = await db.query(
          `INSERT INTO leave_requests AS l (employee_id, type, from_date, to_date, days, reason, stage, approver_employee_id)
           VALUES ($3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${columns("$1::text", "$2::text", "$11::uuid")}`,
          [viewer.employeeId, viewer.role, employeeId, input.type, input.from, input.to, days, input.reason, approver ? "leader" : "hr", approver, viewer.userId],
        )
        return { kind: "created", leave: rows[0] }
      })
    },

    /** Leads someone, or still has requests waiting for them as Leader (e.g. after the team moved). */
    async mayDecideAsLeader(employeeId: string) {
      const { rowCount } = await pool.query(
        `SELECT 1 WHERE EXISTS (SELECT 1 FROM employees WHERE manager_id = $1 AND status <> 'resigned')
            OR EXISTS (SELECT 1 FROM leave_requests WHERE approver_employee_id = $1 AND status = 'pending' AND stage = 'leader')`,
        [employeeId],
      )
      return (rowCount ?? 0) > 0
    },

    /**
     * Decides the requests the viewer may decide (others are skipped). A Leader's approval forwards
     * the request to HR (still pending); HR's or an executive's decision is final, as is any rejection.
     */
    async decide(ids: string[], status: "approved" | "rejected", viewer: Viewer) {
      // Only the named Leader forwards; an executive (or HR for a stranded request) decides finally
      const forward = `($2 = 'approved' AND l.stage = 'leader' AND l.approver_employee_id = $4::text AND $5::text <> 'executive')`
      const asLeader = `(l.stage = 'leader' AND l.approver_employee_id = $4::text)`
      const { rows } = await pool.query(
        `UPDATE leave_requests l SET
            status = CASE WHEN ${forward} THEN 'pending' ELSE $2 END,
            stage = CASE WHEN ${forward} THEN 'hr' END,
            leader_decided_by_user_id = CASE WHEN ${asLeader} THEN $3::uuid ELSE l.leader_decided_by_user_id END,
            leader_decided_at = CASE WHEN ${asLeader} THEN now() ELSE l.leader_decided_at END,
            decided_by_user_id = CASE WHEN ${forward} THEN NULL ELSE $3::uuid END,
            decided_at = CASE WHEN ${forward} THEN NULL ELSE now() END
          WHERE l.id = ANY($1) AND ${canDecide("$4::text", "$5::text", "$3::uuid")}
          RETURNING ${columns("$4::text", "$5::text", "$3::uuid")}`,
        [ids, status, viewer.userId, viewer.employeeId, viewer.role],
      )
      return rows as { id: string; employeeId: string; type: string; from: string; to: string; days: number; status: LeaveStatus }[]
    },
  }
}

export type LeaveRepository = ReturnType<typeof createLeaveRepository>
