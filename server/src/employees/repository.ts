import type { Role } from "../auth/repository.ts"
import { type Client, type Pool, withTx } from "../db.ts"
import { AppError } from "../errors.ts"
import type { Account, EmployeeInput, ListFilters } from "./types.ts"

const BASIC = `e.id, e.code, e.first_name AS "firstName", e.last_name AS "lastName", e.nickname, e.email, e.phone,
  e.department, e.position, e.status, e.start_date AS "startDate", e.manager_id AS "managerId",
  -- Cache-busting version for /employees/:id/photo; null = no photo
  floor(extract(epoch FROM ph.updated_at) * 1000)::bigint AS "photoVersion"`
const SENSITIVE = `e.salary, e.birth_date AS "birthDate", e.address, e.emergency_name AS "emergencyName",
  e.emergency_phone AS "emergencyPhone", u.username, u.role`
const FULL = `${BASIC}, ${SENSITIVE}`
const FROM = "FROM employees e LEFT JOIN users u ON u.id = e.user_id LEFT JOIN employee_photos ph ON ph.employee_id = e.id"

// API field -> column. Only these can ever appear in an UPDATE.
const COLUMNS: Record<keyof EmployeeInput, string> = {
  code: "code",
  firstName: "first_name",
  lastName: "last_name",
  nickname: "nickname",
  email: "email",
  phone: "phone",
  department: "department",
  position: "position",
  status: "status",
  startDate: "start_date",
  salary: "salary",
  birthDate: "birth_date",
  address: "address",
  emergencyName: "emergency_name",
  emergencyPhone: "emergency_phone",
  managerId: "manager_id",
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

async function findFull(db: Client | Pool, id: string) {
  const { rows } = await db.query(`SELECT ${FULL} ${FROM} WHERE e.id = $1`, [id])
  return rows[0] ?? null
}

async function insertUser(db: Client, a: { username: string; email: string; name: string; role: Role; department: string; passwordHash: string }) {
  const { rows } = await db.query<{ id: string }>(
    // A password chosen by HR is temporary: the person must replace it at first login
    "INSERT INTO users (username, email, name, role, department, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id",
    [a.username, a.email, a.name, a.role, a.department, a.passwordHash],
  )
  return rows[0].id
}

export function createEmployeeRepository(pool: Pool) {
  return {
    /** Full record (for audit diffs). */
    get: (id: string) => findFull(pool, id),

    /** Account owner and role of each employee, for permission checks. */
    async targets(ids: string[]) {
      const { rows } = await pool.query<{ id: string; userId: string | null; role: string | null }>(
        `SELECT e.id, e.user_id AS "userId", u.role FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = ANY($1)`,
        [ids],
      )
      return rows
    },

    /** One query (with window count). Sensitive columns are only selected for privileged viewers. */
    async list(f: ListFilters, privileged: boolean) {
      const params: unknown[] = []
      const where: string[] = []
      if (f.q) {
        params.push(`%${escapeLike(f.q)}%`)
        where.push(`(e.first_name || ' ' || e.last_name || ' ' || e.nickname || ' ' || e.code || ' ' || e.email || ' ' || e.position) ILIKE $${params.length}`)
      }
      if (f.department) where.push(`e.department = $${params.push(f.department)}`)
      if (f.status) where.push(`e.status = $${params.push(f.status)}`)
      params.push(f.pageSize, (f.page - 1) * f.pageSize)
      const { rows } = await pool.query(
        `SELECT ${privileged ? FULL : BASIC}, count(*) OVER() AS total ${FROM}
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY e.code
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      const total = rows.length ? Number(rows[0].total) : 0
      return { employees: rows.map(({ total: _t, ...e }) => e), total }
    },

    /** Employee + login account in one transaction. */
    async create(input: EmployeeInput, account: Omit<Account, "password"> & { passwordHash: string }) {
      return withTx(pool, async (db) => {
        const userId = await insertUser(db, {
          username: account.username,
          email: input.email,
          name: `${input.firstName} ${input.lastName}`,
          role: account.role,
          department: input.department,
          passwordHash: account.passwordHash,
        })
        const keys = Object.keys(input) as (keyof EmployeeInput)[]
        const cols = [...keys.map((k) => COLUMNS[k]), "user_id"]
        const values = [...keys.map((k) => input[k]), userId]
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO employees (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
          values,
        )
        return findFull(db, rows[0].id)
      })
    },

    /** Updates the record and keeps the linked account's email/name/department in sync. */
    async update(id: string, patch: Partial<EmployeeInput>) {
      return withTx(pool, async (db) => {
        if (patch.managerId) {
          // Serialise reporting-line changes: two concurrent edits (A→B and B→A) must not both pass the check
          await db.query("SELECT pg_advisory_xact_lock(hashtext('employee_tree'))")
          // Walk up from the new leader; reaching this employee would create a loop (A leads B leads A)
          const { rowCount } = await db.query(
            `WITH RECURSIVE up AS (
               SELECT id, manager_id FROM employees WHERE id = $1
               UNION SELECT e.id, e.manager_id FROM employees e JOIN up ON e.id = up.manager_id
             ) SELECT 1 FROM up WHERE id = $2`,
            [patch.managerId, id],
          )
          if (rowCount) throw new AppError(400, "VALIDATION_ERROR", "Team leader would create a loop", [{ field: "managerId" }])
        }
        const keys = (Object.keys(patch) as (keyof EmployeeInput)[]).filter((k) => patch[k] !== undefined)
        // Tasks are keyed by email: remember the old one so they can follow the change
        const { rows: before } = await db.query<{ email: string }>("SELECT email FROM employees WHERE id = $1 FOR UPDATE", [id])
        const sets = keys.map((k, i) => `${COLUMNS[k]} = $${i + 1}`)
        const { rowCount } = await db.query(
          `UPDATE employees SET ${[...sets, "updated_at = now()"].join(", ")} WHERE id = $${keys.length + 1}`,
          [...keys.map((k) => patch[k]), id],
        )
        if (!rowCount) return null
        // Resigning ends every open session of that person right away
        if (patch.status === "resigned") {
          await db.query("DELETE FROM sessions WHERE user_id = (SELECT user_id FROM employees WHERE id = $1)", [id])
        }
        if (patch.email !== undefined && before[0] && before[0].email !== patch.email) {
          await db.query("UPDATE tasks SET assignee_email = $2, updated_at = now() WHERE assignee_email = $1", [before[0].email, patch.email])
        }
        await db.query(
          `UPDATE users u SET email = e.email, name = e.first_name || ' ' || e.last_name, department = e.department, updated_at = now()
             FROM employees e WHERE e.id = $1 AND u.id = e.user_id`,
          [id],
        )
        return findFull(db, id)
      })
    },

    /** Deletes employees and their login accounts (sessions cascade). Refuses to delete the caller's own record. */
    /** "CODE First Last" of several employees in one query (for the audit trail). */
    async labels(ids: string[]) {
      const { rows } = await pool.query<{ l: string }>("SELECT code || ' ' || first_name || ' ' || last_name AS l FROM employees WHERE id = ANY($1) ORDER BY code", [ids])
      return rows.map((r) => r.l)
    },

    async remove(ids: string[], callerUserId: string) {
      return withTx(pool, async (db) => {
        const { rowCount: self } = await db.query("SELECT 1 FROM employees WHERE id = ANY($1) AND user_id = $2", [ids, callerUserId])
        if (self) throw new AppError(400, "CANNOT_DELETE_SELF", "You cannot delete your own employee record")
        // Their tasks go too, so a future holder of the same email does not inherit them
        await db.query("DELETE FROM tasks WHERE assignee_email IN (SELECT email FROM employees WHERE id = ANY($1))", [ids])
        await db.query("DELETE FROM users WHERE id IN (SELECT user_id FROM employees WHERE id = ANY($1) AND user_id IS NOT NULL)", [ids])
        const { rowCount } = await db.query("DELETE FROM employees WHERE id = ANY($1)", [ids])
        return rowCount ?? 0
      })
    },

    /**
     * Creates the account if the employee has none (username required), otherwise sets a new password
     * (and optionally username/role). Changing the password signs the user out everywhere.
     */
    async setAccount(id: string, a: Partial<Omit<Account, "password">> & { passwordHash: string }) {
      return withTx(pool, async (db) => {
        const { rows } = await db.query(
          "SELECT user_id, email, first_name, last_name, department FROM employees WHERE id = $1 FOR UPDATE",
          [id],
        )
        const emp = rows[0]
        if (!emp) return null
        if (!emp.user_id) {
          if (!a.username) throw new AppError(400, "VALIDATION_ERROR", "username is required to create an account", [{ field: "username" }])
          const userId = await insertUser(db, {
            username: a.username,
            email: emp.email,
            name: `${emp.first_name} ${emp.last_name}`,
            role: a.role ?? "staff",
            department: emp.department,
            passwordHash: a.passwordHash,
          })
          await db.query("UPDATE employees SET user_id = $1, updated_at = now() WHERE id = $2", [userId, id])
        } else {
          await db.query(
            `UPDATE users SET password_hash = $1, must_change_password = true, username = COALESCE($2, username), role = COALESCE($3, role), updated_at = now()
              WHERE id = $4`,
            [a.passwordHash, a.username ?? null, a.role ?? null, emp.user_id],
          )
          await db.query("DELETE FROM sessions WHERE user_id = $1", [emp.user_id])
        }
        return findFull(db, id)
      })
    },
  }
}

export type EmployeeRepository = ReturnType<typeof createEmployeeRepository>
