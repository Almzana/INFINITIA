import type { Client, Pool } from "../db.ts"

/** Project membership: who may log timesheet hours on which project. */
export function createMemberRepository(pool: Pool) {
  return {
    /** "added" | "exists" | "no-project" | "no-employee" (missing or resigned). */
    async add(projectId: string, employeeId: string) {
      const { rows } = await pool.query<{ p: boolean; e: boolean; ins: boolean }>(
        `WITH p AS (SELECT 1 FROM projects WHERE id = $1),
              e AS (SELECT 1 FROM employees WHERE id = $2 AND status <> 'resigned'),
              ins AS (
                INSERT INTO project_members (project_id, employee_id)
                SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM p) AND EXISTS (SELECT 1 FROM e)
                ON CONFLICT DO NOTHING RETURNING 1)
         SELECT EXISTS (SELECT 1 FROM p) AS p, EXISTS (SELECT 1 FROM e) AS e, EXISTS (SELECT 1 FROM ins) AS ins`,
        [projectId, employeeId],
      )
      const r = rows[0]
      if (!r.p) return "no-project" as const
      if (!r.e) return "no-employee" as const
      return r.ins ? ("added" as const) : ("exists" as const)
    },

    async remove(projectId: string, employeeId: string) {
      const { rowCount } = await pool.query("DELETE FROM project_members WHERE project_id = $1 AND employee_id = $2", [projectId, employeeId])
      return (rowCount ?? 0) > 0
    },
  }
}

/** Of the given projects, those `employeeId` is not a member of (one query; [] = all allowed). */
export async function notMemberOf(db: Client | Pool, employeeId: string, projectIds: string[]) {
  if (projectIds.length === 0) return []
  const { rows } = await db.query<{ id: string }>(
    `SELECT DISTINCT x.id FROM unnest($2::text[]) AS x(id)
      WHERE NOT EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = x.id AND m.employee_id = $1)`,
    [employeeId, projectIds],
  )
  return rows.map((r) => r.id)
}

export type MemberRepository = ReturnType<typeof createMemberRepository>
