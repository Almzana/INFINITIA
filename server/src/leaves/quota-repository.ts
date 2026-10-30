import { type Client, type Pool, withTx } from "../db.ts"
import type { LeaveType } from "./repository.ts"

type Db = Client | Pool

const yearRange = (yearParam: string) => `l.from_date >= make_date(${yearParam}, 1, 1) AND l.from_date < make_date(${yearParam} + 1, 1, 1)`

/** Holidays between two dates, as a set of ISO dates (used when counting working days). */
export async function holidaysBetween(db: Db, from: string, to: string) {
  const { rows } = await db.query<{ d: string }>("SELECT date AS d FROM holidays WHERE date BETWEEN $1 AND $2", [from, to])
  return new Set(rows.map((r) => r.d))
}

/** Quota of one type for one person and year, and the days already taken (approved + pending). */
export async function quotaFor(db: Db, employeeId: string, type: LeaveType, year: number) {
  const { rows } = await db.query<{ quota: number; enforce: boolean; taken: number }>(
    `SELECT COALESCE(q.days, p.days_per_year) AS quota, p.enforce,
            (SELECT COALESCE(sum(l.days), 0)::int FROM leave_requests l
              WHERE l.employee_id = $1 AND l.type = $2 AND l.status <> 'rejected' AND ${yearRange("$3::int")}) AS taken
       FROM leave_policies p LEFT JOIN leave_quotas q ON q.employee_id = $1 AND q.year = $3 AND q.type = p.type
      WHERE p.type = $2`,
    [employeeId, type, year],
  )
  return rows[0] ?? { quota: 0, enforce: false, taken: 0 }
}

/**
 * Recount working days (weekdays that are not holidays) of the pending / approved requests covering
 * `date`, from their range and the current calendar — so adding and removing a holiday always
 * cancel out. A request left with no working day keeps 1 (CHECK days >= 1); HR can reject it.
 */
async function recount(db: Db, date: string) {
  await db.query(
    `UPDATE leave_requests l SET days = greatest(1, (
         SELECT count(*) FROM generate_series(l.from_date, l.to_date, interval '1 day') AS d(day)
          WHERE extract(isodow FROM d.day) < 6 AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.date = d.day::date)))
      WHERE l.status <> 'rejected' AND l.from_date <= $1 AND l.to_date >= $1`,
    [date],
  )
}

/** Holiday edits and leave creation are serialised (create holds the shared side). */
export const HOLIDAY_LOCK = "hashtext('holidays')"

/** Leave policy, per-person quotas, balances and the holiday calendar. */
export function createQuotaRepository(pool: Pool) {
  return {
    /** Every type with quota, approved days, pending days and what is left — one grouped query. */
    async balance(employeeId: string, year: number) {
      const { rows } = await pool.query(
        `SELECT p.type, COALESCE(q.days, p.days_per_year) AS quota, p.enforce,
                COALESCE(sum(l.days) FILTER (WHERE l.status = 'approved'), 0)::int AS used,
                COALESCE(sum(l.days) FILTER (WHERE l.status = 'pending'), 0)::int AS pending
           FROM leave_policies p
           LEFT JOIN leave_quotas q ON q.employee_id = $1 AND q.year = $2 AND q.type = p.type
           LEFT JOIN leave_requests l ON l.employee_id = $1 AND l.type = p.type AND l.status <> 'rejected' AND ${yearRange("$2::int")}
          GROUP BY p.type, q.days, p.days_per_year, p.enforce
          ORDER BY array_position(ARRAY['vacation', 'sick', 'personal', 'maternity'], p.type)`,
        [employeeId, year],
      )
      return rows.map((r) => ({ ...r, remaining: r.quota - r.used - r.pending }))
    },

    async policies() {
      const { rows } = await pool.query(
        `SELECT type, days_per_year AS "daysPerYear", enforce FROM leave_policies
          ORDER BY array_position(ARRAY['vacation', 'sick', 'personal', 'maternity'], type)`,
      )
      return rows
    },

    async setPolicy(type: LeaveType, daysPerYear: number, enforce: boolean) {
      const { rows } = await pool.query(
        `UPDATE leave_policies SET days_per_year = $2, enforce = $3 WHERE type = $1 RETURNING type, days_per_year AS "daysPerYear", enforce`,
        [type, daysPerYear, enforce],
      )
      return rows[0]
    },

    /** null days removes the exception (back to the policy default). */
    async setQuota(employeeId: string, year: number, type: LeaveType, days: number | null) {
      if (days === null) {
        await pool.query("DELETE FROM leave_quotas WHERE employee_id = $1 AND year = $2 AND type = $3", [employeeId, year, type])
        return
      }
      await pool.query(
        `INSERT INTO leave_quotas (employee_id, year, type, days) VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, year, type) DO UPDATE SET days = EXCLUDED.days`,
        [employeeId, year, type, days],
      )
    },

    async holidays(year: number) {
      const { rows } = await pool.query(
        "SELECT date, name FROM holidays WHERE date >= make_date($1, 1, 1) AND date < make_date($1 + 1, 1, 1) ORDER BY date",
        [year],
      )
      return rows
    },

    /** Adds (or renames) a holiday; a new weekday holiday is no longer counted in requests that cover it. */
    async addHoliday(date: string, name: string) {
      return withTx(pool, async (db) => {
        await db.query(`SELECT pg_advisory_xact_lock(${HOLIDAY_LOCK})`)
        const { rows } = await db.query<{ date: string; name: string; inserted: boolean }>(
          `INSERT INTO holidays (date, name) VALUES ($1, $2) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name
           RETURNING date, name, (xmax = 0) AS inserted`,
          [date, name],
        )
        // A request on that day alone keeps 1 day (CHECK days >= 1); HR can reject it if it is moot
        if (rows[0].inserted) await recount(db, date)
        return { date: rows[0].date, name: rows[0].name }
      })
    },

    /** Removes a holiday; a weekday becomes a working day again in requests that cover it. */
    async removeHoliday(date: string) {
      return withTx(pool, async (db) => {
        await db.query(`SELECT pg_advisory_xact_lock(${HOLIDAY_LOCK})`)
        const { rowCount } = await db.query("DELETE FROM holidays WHERE date = $1", [date])
        if (rowCount) await recount(db, date)
        return (rowCount ?? 0) > 0
      })
    },

    /** Role of the account linked to an employee (null = no account), undefined = no such employee. */
    async roleOf(employeeId: string) {
      const { rows } = await pool.query<{ role: string | null }>("SELECT u.role FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1", [employeeId])
      return rows.length ? rows[0].role : undefined
    },

    /** Whether `leaderEmployeeId` is the direct Leader of `employeeId`. */
    async isLeaderOf(leaderEmployeeId: string, employeeId: string) {
      const { rowCount } = await pool.query("SELECT 1 FROM employees WHERE id = $1 AND manager_id = $2", [employeeId, leaderEmployeeId])
      return (rowCount ?? 0) > 0
    },
  }
}

export type QuotaRepository = ReturnType<typeof createQuotaRepository>
