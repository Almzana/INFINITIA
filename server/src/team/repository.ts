import type { AuthUser } from "../auth/repository.ts"
import type { Pool } from "../db.ts"

export function createTeamRepository(pool: Pool) {
  return {
    /** Direct reports of the user's employee record, with task counts — one grouped query. */
    async members(userId: string) {
      const { rows } = await pool.query(
        `SELECT e.id, e.code, e.first_name AS "firstName", e.last_name AS "lastName", e.nickname, e.position, e.email,
                (SELECT floor(extract(epoch FROM ph.updated_at) * 1000)::bigint FROM employee_photos ph WHERE ph.employee_id = e.id) AS "photoVersion",
                (e.user_id IS NOT NULL) AS "hasAccount",
                count(t.id) FILTER (WHERE t.status = 'todo')::int AS "openTasks",
                count(t.id) FILTER (WHERE t.status = 'todo' AND t.due_date < current_date)::int AS "overdueTasks"
           FROM employees e
           LEFT JOIN tasks t ON t.assignee_email = e.email
          WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = $1)
            AND e.status <> 'resigned'
          GROUP BY e.id
          ORDER BY e.first_name`,
        [userId],
      )
      return rows
    },

    /** A Leader is anyone with at least one active (not resigned) direct report — same rule as members(). */
    async isLeader(userId: string) {
      const { rows } = await pool.query<{ ok: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM employees WHERE status <> 'resigned' AND manager_id = (SELECT id FROM employees WHERE user_id = $1)) AS ok",
        [userId],
      )
      return rows[0].ok
    },

    /**
     * The employee if `caller` may assign to / view the tasks of them: their direct leader,
     * or an executive. Otherwise null (route answers 403).
     */
    async assignable(caller: AuthUser, employeeId: string) {
      const { rows } = await pool.query<{ id: string; email: string }>(
        `SELECT e.id, e.email FROM employees e
          WHERE e.id = $1 AND e.status <> 'resigned'
            AND ($3::boolean OR e.manager_id = (SELECT id FROM employees WHERE user_id = $2))`,
        [employeeId, caller.id, caller.role === "executive"],
      )
      return rows[0] ?? null
    },
  }
}

export type TeamRepository = ReturnType<typeof createTeamRepository>
