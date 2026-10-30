import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify"
import { currentUser, requireRole } from "../auth/guard.ts"
import { type Pool, withTx } from "../db.ts"
import { AppError, forbidden } from "../errors.ts"
import { notMemberOf } from "../projects/members.ts"

const date = { type: "string", format: "date" } as const
const employeeId = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const
const phase = { type: "string", enum: ["concept", "schematic", "design-dev", "construction-docs", "permit", "construction", "handover"] } as const
const DAY = 86_400_000
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY

const COLUMNS = `id, employee_id AS "employeeId", project_id AS "projectId", phase, date, hours::float AS hours, note`

type Entry = { projectId: string; phase: string; date: string; hours: number; note?: string }

/**
 * Timesheet: staff read and write only their own entries; executives read anyone's (or everyone's)
 * and may correct anyone's week. HR has no access (see the page access table).
 */
export function timesheetRoutes(pool: Pool, authenticate: preHandlerHookHandler) {
  /** Whose entries this request is about: own record, or any for executives. */
  const target = (req: FastifyRequest, requested?: string) => {
    const u = currentUser(req)
    if (u.role === "executive") return requested ?? null
    if (!u.employeeId) throw new AppError(400, "NO_EMPLOYEE_RECORD", "Your account is not linked to an employee record")
    if (requested && requested !== u.employeeId) throw forbidden()
    return u.employeeId
  }

  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)
    app.addHook("preHandler", requireRole("staff", "executive"))

    app.get<{ Querystring: { from: string; to: string; employeeId?: string } }>(
      "/timesheet",
      {
        schema: {
          querystring: { type: "object", properties: { from: date, to: date, employeeId }, required: ["from", "to"], additionalProperties: false },
        },
      },
      async (req) => {
        const { from, to } = req.query
        if (days(from, to) < 0 || days(from, to) > 92) throw new AppError(400, "VALIDATION_ERROR", "Range must be 0–92 days")
        // An account without an employee record (e.g. the dev account) simply has no entries;
        // only saving needs a record, so reading is not an error
        const u = currentUser(req)
        if (u.role !== "executive" && !u.employeeId && !req.query.employeeId) return { data: [] }
        const who = target(req, req.query.employeeId)
        const { rows } = await pool.query(
          `SELECT ${COLUMNS} FROM time_entries WHERE date BETWEEN $1 AND $2 ${who ? "AND employee_id = $3" : ""} ORDER BY date, employee_id`,
          who ? [from, to, who] : [from, to],
        )
        return { data: rows }
      },
    )

    // Replaces one person's entries for one week (the week editor saves the whole grid)
    app.put<{ Body: { employeeId?: string; from: string; to: string; entries: Entry[] } }>(
      "/timesheet/week",
      {
        schema: {
          headers: { type: "object", properties: { "content-type": { type: "string", pattern: "^application/json" } }, required: ["content-type"] },
          body: {
            type: "object",
            properties: {
              employeeId,
              from: date,
              to: date,
              entries: {
                type: "array",
                maxItems: 200,
                items: {
                  type: "object",
                  properties: {
                    projectId: { type: "string", pattern: "^[A-Z]{2}[0-9]{3,6}$" },
                    phase,
                    date,
                    hours: { type: "number", exclusiveMinimum: 0, maximum: 24, multipleOf: 0.5 },
                    note: { type: "string", maxLength: 500 },
                  },
                  required: ["projectId", "phase", "date", "hours"],
                  additionalProperties: false,
                },
              },
            },
            required: ["from", "to", "entries"],
            additionalProperties: false,
          },
        },
      },
      async (req) => {
        const { from, to, entries } = req.body
        const who = target(req, req.body.employeeId) ?? currentUser(req).employeeId
        if (!who) throw new AppError(400, "VALIDATION_ERROR", "employeeId is required", [{ field: "employeeId" }])
        if (days(from, to) < 0 || days(from, to) > 6) throw new AppError(400, "VALIDATION_ERROR", "A week is at most 7 days")
        if (entries.some((e) => e.date < from || e.date > to)) throw new AppError(400, "VALIDATION_ERROR", "Entries must be inside the week")
        const perDay = new Map<string, number>()
        for (const e of entries) perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.hours)
        if ([...perDay.values()].some((h) => h > 24)) throw new AppError(400, "VALIDATION_ERROR", "More than 24 hours on one day")
        // Hours only on projects this person is a member of (executives correcting a week included)
        const outside = await notMemberOf(pool, who, [...new Set(entries.map((e) => e.projectId))])
        if (outside.length) throw new AppError(400, "NOT_PROJECT_MEMBER", "Not a member of these projects", outside.map((id) => ({ field: "projectId", message: id })))

        const rows = await withTx(pool, async (db) => {
          await db.query("DELETE FROM time_entries WHERE employee_id = $1 AND date BETWEEN $2 AND $3", [who, from, to])
          if (entries.length) {
            await db.query(
              `INSERT INTO time_entries (employee_id, project_id, phase, date, hours, note)
               SELECT $1, "projectId", phase, date::date, hours, note
                 FROM jsonb_to_recordset($2::jsonb) AS x("projectId" text, phase text, date text, hours numeric, note text)`,
              [who, JSON.stringify(entries)],
            )
          }
          const res = await db.query(`SELECT ${COLUMNS} FROM time_entries WHERE employee_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date`, [who, from, to])
          return res.rows
        }).catch((err) => {
          if ((err as { code?: string }).code === "23503") throw new AppError(400, "VALIDATION_ERROR", "Unknown employee or project")
          throw err
        })
        return { employeeId: who, data: rows }
      },
    )
  }
}
