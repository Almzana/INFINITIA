import type { Pool } from "../db.ts"

export type Priority = "low" | "medium" | "high"
export type Status = "todo" | "done"

export interface Task {
  id: string
  title: string
  description: string | null
  assigneeEmail: string
  dueDate: string | null
  priority: Priority
  status: Status
  projectId: string | null
  /** Set when a leader assigned the task; null when the assignee created it */
  assignedByUserId: string | null
  assignedByName: string | null
  createdAt: string
  updatedAt: string
}

export type NewTask = Pick<Task, "title" | "assigneeEmail"> &
  Partial<Pick<Task, "description" | "dueDate" | "priority" | "projectId">>
export type TaskPatch = Partial<Pick<Task, "title" | "description" | "dueDate" | "priority" | "status" | "projectId">>

/** Who is acting: the assignee (by email) or the leader who assigned it (by user id). */
export interface Actor {
  email: string
  userId: string
  isExecutive: boolean
}

/**
 * The assigner keeps rights over a task only while still leading the assignee (or as an executive).
 * `u` and `x` are the SQL placeholders (e.g. "$3") holding the user id and the is-executive flag.
 */
const STILL_LEADS = (u: string, x: string) =>
  `(assigned_by_user_id = ${u} AND (${x}::boolean OR EXISTS (
     SELECT 1 FROM employees e WHERE e.email = tasks.assignee_email
        AND e.manager_id = (SELECT id FROM employees WHERE user_id = ${u}))))`

const COLUMNS = `id, title, description, assignee_email AS "assigneeEmail", due_date AS "dueDate",
  priority, status, project_id AS "projectId", assigned_by_user_id AS "assignedByUserId",
  assigned_by_name AS "assignedByName", created_at AS "createdAt", updated_at AS "updatedAt"`

// Whitelist of patchable fields -> columns; nothing else ever reaches the SQL text.
const PATCH_COLUMNS: Record<keyof TaskPatch, string> = {
  title: "title",
  description: "description",
  dueDate: "due_date",
  priority: "priority",
  status: "status",
  projectId: "project_id",
}

export function createTaskRepository(pool: Pool) {
  return {
    /** Open tasks first, then by due date (no date last), then by priority. One query incl. total count. */
    async list(assigneeEmail: string, opts: { status?: Status; page: number; pageSize: number }) {
      const params: unknown[] = [assigneeEmail]
      let where = "assignee_email = $1"
      if (opts.status) {
        params.push(opts.status)
        where += ` AND status = $${params.length}`
      }
      params.push(opts.pageSize, (opts.page - 1) * opts.pageSize)
      const { rows } = await pool.query<Task & { total: string }>(
        `SELECT ${COLUMNS}, count(*) OVER() AS total
           FROM tasks
          WHERE ${where}
          ORDER BY status = 'done', due_date NULLS LAST,
                   CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      const total = rows.length ? Number(rows[0].total) : 0
      return { tasks: rows.map(({ total: _total, ...t }) => t), total }
    },

    async create(input: NewTask, assignedBy: { userId: string; name: string } | null) {
      const { rows } = await pool.query<Task>(
        `INSERT INTO tasks (title, description, assignee_email, due_date, priority, project_id, assigned_by_user_id, assigned_by_name)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'medium'), $6, $7, $8)
         RETURNING ${COLUMNS}`,
        [
          input.title,
          input.description ?? null,
          input.assigneeEmail,
          input.dueDate ?? null,
          input.priority ?? null,
          input.projectId ?? null,
          assignedBy?.userId ?? null,
          assignedBy?.name ?? null,
        ],
      )
      return rows[0]
    },

    /** The assignee or the leader who assigned it may update; returns null otherwise (route answers 404). */
    async update(id: string, actor: Actor, patch: TaskPatch) {
      const sets: string[] = []
      const params: unknown[] = []
      for (const [key, column] of Object.entries(PATCH_COLUMNS) as [keyof TaskPatch, string][]) {
        if (patch[key] === undefined) continue
        params.push(patch[key])
        sets.push(`${column} = $${params.length}`)
      }
      params.push(id, actor.email, actor.userId, actor.isExecutive)
      const n = params.length
      const { rows } = await pool.query<Task>(
        `UPDATE tasks SET ${sets.join(", ")}, updated_at = now()
          WHERE id = $${n - 3} AND (assignee_email = $${n - 2} OR ${STILL_LEADS(`$${n - 1}`, `$${n}`)})
          RETURNING ${COLUMNS}`,
        params,
      )
      return rows[0] ?? null
    },

    /** Leaders can delete what they assigned; assignees only what they created themselves. */
    async remove(id: string, actor: Actor) {
      const { rowCount } = await pool.query(
        `DELETE FROM tasks
          WHERE id = $1
            AND (${STILL_LEADS("$3", "$4")} OR (assignee_email = $2 AND (assigned_by_user_id IS NULL OR assigned_by_user_id = $3)))`,
        [id, actor.email, actor.userId, actor.isExecutive],
      )
      return (rowCount ?? 0) > 0
    },
  }
}

export type TaskRepository = ReturnType<typeof createTaskRepository>
