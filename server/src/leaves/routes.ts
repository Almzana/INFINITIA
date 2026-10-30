import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { currentUser, isPrivileged } from "../auth/guard.ts"
import type { AuthUser } from "../auth/repository.ts"
import { audit } from "../audit/audit.ts"
import { AppError, forbidden } from "../errors.ts"
import { notify, notifyEach } from "../notifications/notify.ts"
import { cleanText } from "../tasks/sanitize.ts"
import type { LeaveRepository, LeaveStatus, LeaveType, Viewer } from "./repository.ts"

const date = { type: "string", format: "date" } as const
const leaveId = { type: "string", minLength: 1, maxLength: 32, pattern: "^[A-Za-z0-9-]+$" } as const
const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const listSchema = {
  querystring: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["pending", "approved", "rejected"] },
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 500, default: 100 },
    },
    additionalProperties: false,
  },
} as const

const createSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["sick", "vacation", "personal", "maternity"] },
      from: date,
      to: date,
      reason: { type: "string", minLength: 3, maxLength: 1000 },
    },
    required: ["type", "from", "to", "reason"],
    additionalProperties: false,
  },
} as const

const decideSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: {
      ids: { type: "array", items: leaveId, minItems: 1, maxItems: 100, uniqueItems: true },
      status: { type: "string", enum: ["approved", "rejected"] },
    },
    required: ["ids", "status"],
    additionalProperties: false,
  },
} as const

const viewerOf = (u: AuthUser): Viewer => ({ userId: u.id, employeeId: u.employeeId, role: u.role })
const noticeOf = (l: { id: string; type: string; from: string; to: string; days: number }, type: string) => ({
  type,
  params: { type: l.type, from: l.from, to: l.to, days: l.days },
  link: `/leave?view=${l.id}`,
})

/**
 * Leave: everyone files their own requests. A request waits for the requester's Leader first
 * (when they have one), then for HR; executives may decide at any stage. Nobody decides their own.
 */
export function leaveRoutes(repo: LeaveRepository, authenticate: preHandlerHookHandler) {
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    app.get<{ Querystring: { status?: LeaveStatus; page: number; pageSize: number } }>("/leaves", { schema: listSchema }, async (req) => {
      const u = currentUser(req)
      const { status, page, pageSize } = req.query
      // No employee record = nothing of one's own (or one's team's) to show
      if (!isPrivileged(u) && !u.employeeId) return { data: [], meta: { page, pageSize, total: 0 } }
      const { items, total } = await repo.list(viewerOf(u), { status, page, pageSize })
      return { data: items, meta: { page, pageSize, total } }
    })

    app.post<{ Body: { type: LeaveType; from: string; to: string; reason: string } }>("/leaves", { schema: createSchema }, async (req, reply) => {
      const u = currentUser(req)
      if (!u.employeeId) throw new AppError(400, "NO_EMPLOYEE_RECORD", "Your account is not linked to an employee record")
      const { type, from, to } = req.body
      if (to < from) throw new AppError(400, "VALIDATION_ERROR", "to must not be before from", [{ field: "to" }])
      // Quotas are per calendar year: leave across New Year is filed as two requests (also caps the length)
      if (from.slice(0, 4) !== to.slice(0, 4)) throw new AppError(400, "LEAVE_CROSSES_YEAR", "A request must stay within one calendar year; file the days after New Year separately", [{ field: "to" }])
      const reason = cleanText(req.body.reason)
      if (reason.length < 3) throw new AppError(400, "VALIDATION_ERROR", "reason is too short", [{ field: "reason" }])
      const res = await repo.create(u.employeeId, viewerOf(u), { type, from, to, reason })
      if (res.kind === "no-working-days") throw new AppError(400, "VALIDATION_ERROR", "The range has no working days", [{ field: "from" }])
      if (res.kind === "overlap") throw new AppError(409, "LEAVE_OVERLAP", "You already have a leave request in this period", [{ field: "from" }])
      if (res.kind === "quota") {
        const left = Math.max(0, res.quota - res.taken)
        throw new AppError(409, "LEAVE_QUOTA_EXCEEDED", `Only ${left} day(s) of this leave type left this year`, [{ field: "to", message: String(left) }])
      }
      const created = res.leave
      await audit(req, { action: "leave.requested", entity: "leave", entityId: created.id, details: { type, from, to, days: created.days, stage: created.stage } })
      // The Leader hears about it first; without one, everyone who can approve at the HR stage
      await notify(req, created.approverEmployeeId ? { employeeIds: [created.approverEmployeeId] } : { roles: ["hr", "executive"] }, noticeOf(created, "leave.requested"))
      return reply.status(201).send(created)
    })

    app.put<{ Body: { ids: string[]; status: "approved" | "rejected" } }>("/leaves/status", { schema: decideSchema }, async (req) => {
      const u = currentUser(req)
      // Staff may only decide as a Leader (of a team, or of requests still waiting for them)
      if (!isPrivileged(u) && !(u.employeeId && (await repo.mayDecideAsLeader(u.employeeId)))) throw forbidden()
      const updated = await repo.decide(req.body.ids, req.body.status, viewerOf(u))
      const forwarded = updated.filter((l) => l.status === "pending")
      const final = updated.filter((l) => l.status !== "pending")
      if (updated.length) {
        await audit(req, { action: `leave.${req.body.status}`, entity: "leave", entityId: updated.map((l) => l.id).join(","), details: { count: updated.length, forwarded: forwarded.length } })
        // Each requester hears about their own request (one insert for the whole batch)
        await notifyEach(req, [
          ...final.map((l) => ({ employeeId: l.employeeId, notice: noticeOf(l, `leave.${l.status}`) })),
          ...forwarded.map((l) => ({ employeeId: l.employeeId, notice: noticeOf(l, "leave.forwarded") })),
        ])
        // Forwarded requests now wait for HR
        if (forwarded.length === 1) await notify(req, { roles: ["hr", "executive"] }, noticeOf(forwarded[0], "leave.requested"))
        else if (forwarded.length > 1) await notify(req, { roles: ["hr", "executive"] }, { type: "leave.requested_many", params: { count: forwarded.length }, link: "/leave" })
      }
      return { data: updated, skipped: req.body.ids.length - updated.length }
    })
  }
}
