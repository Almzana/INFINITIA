import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { currentUser, isPrivileged, requireRole } from "../auth/guard.ts"
import { audit } from "../audit/audit.ts"
import { AppError, forbidden, notFound } from "../errors.ts"
import { cleanText } from "../tasks/sanitize.ts"
import type { QuotaRepository } from "./quota-repository.ts"
import type { LeaveType } from "./repository.ts"

const date = { type: "string", format: "date" } as const
const year = { type: "integer", minimum: 2000, maximum: 2100 } as const
const leaveType = { type: "string", enum: ["sick", "vacation", "personal", "maternity"] } as const
const employeeId = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const
const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const
const thisYear = () => Number(new Date().toLocaleString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 4))

/**
 * Leave balances (own; any for HR / executives; a Leader's direct reports), the leave policy and
 * per-person quotas (HR / executives change them), and the holiday calendar (everyone reads,
 * HR / executives edit).
 */
export function quotaRoutes(repo: QuotaRepository, authenticate: preHandlerHookHandler) {
  const managers = requireRole("hr", "executive")
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    app.get<{ Querystring: { year?: number; employeeId?: string } }>(
      "/leaves/balance",
      { schema: { querystring: { type: "object", properties: { year, employeeId }, additionalProperties: false } } },
      async (req) => {
        const u = currentUser(req)
        const target = req.query.employeeId ?? u.employeeId
        const y = req.query.year ?? thisYear()
        if (!target) return { year: y, data: [] }
        const allowed = target === u.employeeId || isPrivileged(u) || (!!u.employeeId && (await repo.isLeaderOf(u.employeeId, target)))
        if (!allowed) throw forbidden()
        return { year: y, employeeId: target, data: await repo.balance(target, y) }
      },
    )

    app.get("/leaves/policy", async () => ({ data: await repo.policies() }))

    app.put<{ Params: { type: LeaveType }; Body: { daysPerYear: number; enforce: boolean } }>(
      "/leaves/policy/:type",
      {
        preHandler: managers,
        schema: {
          headers: jsonHeaders,
          params: { type: "object", properties: { type: leaveType }, required: ["type"] },
          body: {
            type: "object",
            properties: { daysPerYear: { type: "integer", minimum: 0, maximum: 366 }, enforce: { type: "boolean" } },
            required: ["daysPerYear", "enforce"],
            additionalProperties: false,
          },
        },
      },
      async (req) => {
        const updated = await repo.setPolicy(req.params.type, req.body.daysPerYear, req.body.enforce)
        await audit(req, { action: "leave.policy_changed", entity: "leave_policy", entityId: req.params.type, details: req.body })
        return updated
      },
    )

    app.put<{ Params: { employeeId: string }; Body: { year: number; type: LeaveType; days: number | null } }>(
      "/leaves/quotas/:employeeId",
      {
        preHandler: managers,
        schema: {
          headers: jsonHeaders,
          params: { type: "object", properties: { employeeId }, required: ["employeeId"] },
          body: {
            type: "object",
            properties: { year, type: leaveType, days: { type: ["integer", "null"], minimum: 0, maximum: 366 } },
            required: ["year", "type", "days"],
            additionalProperties: false,
          },
        },
      },
      async (req) => {
        const { year: y, type, days } = req.body
        // Same rule as employee records: HR does not change their own entitlements or an executive's
        const u = currentUser(req)
        if (u.role !== "executive") {
          const targetRole = await repo.roleOf(req.params.employeeId)
          if (targetRole === undefined) throw notFound("Employee")
          if (req.params.employeeId === u.employeeId || targetRole === "executive") throw forbidden()
        }
        await repo.setQuota(req.params.employeeId, y, type, days).catch((err) => {
          if ((err as { code?: string }).code === "23503") throw notFound("Employee")
          throw err
        })
        await audit(req, { action: "leave.quota_changed", entity: "employee", entityId: req.params.employeeId, details: req.body })
        return { data: await repo.balance(req.params.employeeId, y) }
      },
    )

    app.get<{ Querystring: { year?: number } }>(
      "/holidays",
      { schema: { querystring: { type: "object", properties: { year }, additionalProperties: false } } },
      async (req) => ({ data: await repo.holidays(req.query.year ?? thisYear()) }),
    )

    app.post<{ Body: { date: string; name: string } }>(
      "/holidays",
      {
        preHandler: managers,
        schema: {
          headers: jsonHeaders,
          body: { type: "object", properties: { date, name: { type: "string", minLength: 1, maxLength: 120 } }, required: ["date", "name"], additionalProperties: false },
        },
      },
      async (req, reply) => {
        const name = cleanText(req.body.name)
        if (!name) throw new AppError(400, "VALIDATION_ERROR", "name is required", [{ field: "name" }])
        const saved = await repo.addHoliday(req.body.date, name)
        await audit(req, { action: "holiday.saved", entity: "holiday", entityId: req.body.date, details: { name } })
        return reply.status(201).send(saved)
      },
    )

    app.delete<{ Params: { date: string } }>(
      "/holidays/:date",
      { preHandler: managers, schema: { params: { type: "object", properties: { date }, required: ["date"] } } },
      async (req, reply) => {
        if (!(await repo.removeHoliday(req.params.date))) throw notFound("Holiday")
        await audit(req, { action: "holiday.removed", entity: "holiday", entityId: req.params.date })
        return reply.status(204).send()
      },
    )
  }
}
