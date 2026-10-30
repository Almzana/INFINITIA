import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify"
import { currentUser, requireRole } from "../auth/guard.ts"
import { audit } from "../audit/audit.ts"
import { AppError, forbidden, notFound } from "../errors.ts"
import { cleanText } from "../tasks/sanitize.ts"
import type { TeamRepository } from "../team/repository.ts"
import type { PhaseKey } from "./logic.ts"
import type { MemberRepository } from "./members.ts"
import type { ChangeOrderInput, ProjectInput, ProjectRepository } from "./repository.ts"
import {
  addChangeOrderSchema,
  createProjectSchema,
  decideChangeOrderSchema,
  getProjectSchema,
  memberSchema,
  setInstallmentSchema,
  setPhaseSchema,
} from "./schemas.ts"

function required(v: string, field: string) {
  const t = cleanText(v)
  if (!t) throw new AppError(400, "VALIDATION_ERROR", `${field} must not be empty`, [{ field }])
  return t
}

/**
 * Projects: staff and executives can view (HR cannot). Creating projects, updating phase progress
 * and raising change orders: executives and Leaders. Money decisions (installment status, approving
 * change orders): executives only.
 */
export function projectRoutes(repo: ProjectRepository, members: MemberRepository, team: TeamRepository, authenticate: preHandlerHookHandler) {
  const viewers = requireRole("staff", "executive")
  const executives = requireRole("executive")
  const leadersOrExecutives = async (req: FastifyRequest) => {
    const u = currentUser(req)
    if (u.role !== "executive" && !(u.role === "staff" && (await team.isLeader(u.id)))) throw forbidden()
  }
  /** Changes to an existing project: executives, or the Leader who created it (not any Leader). */
  const projectEditors = async (req: FastifyRequest<{ Params: { id: string } }>) => {
    await leadersOrExecutives(req)
    const u = currentUser(req)
    if (u.role === "executive") return
    const owner = await repo.createdBy(req.params.id)
    if (owner === undefined) throw notFound("Project")
    if (owner !== u.id) throw forbidden()
  }

  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)
    app.addHook("preHandler", viewers)

    app.get("/projects", async () => ({ data: await repo.list() }))

    app.get<{ Params: { id: string } }>("/projects/:id", { schema: getProjectSchema }, async (req) => {
      const p = await repo.findOne(req.params.id)
      if (!p) throw notFound("Project")
      return p
    })

    app.post<{ Body: Omit<ProjectInput, "location" | "areaSqm"> & Partial<ProjectInput> }>(
      "/projects",
      { schema: createProjectSchema, preHandler: leadersOrExecutives },
      async (req, reply) => {
        const b = req.body
        if (b.end <= b.start) throw new AppError(400, "VALIDATION_ERROR", "end must be after start", [{ field: "end" }])
        if (b.cost >= b.value) throw new AppError(400, "VALIDATION_ERROR", "cost should be below contract value", [{ field: "cost" }])
        const created = await repo.create(
          {
            ...b,
            name: required(b.name, "name"),
            manager: required(b.manager, "manager"),
            location: cleanText(b.location ?? "") || "-",
            areaSqm: b.areaSqm ?? 0,
          },
          currentUser(req).id,
        )
        await audit(req, { action: "project.created", entity: "project", entityId: created?.id, details: { name: b.name, value: b.value } })
        return reply.status(201).send(created)
      },
    )

    app.put<{ Params: { id: string; phase: PhaseKey }; Body: { progress: number } }>(
      "/projects/:id/phases/:phase",
      { schema: setPhaseSchema, preHandler: projectEditors },
      async (req) => {
        const result = await repo.setPhaseProgress(req.params.id, req.params.phase, req.body.progress)
        if (!result) throw notFound("Project phase")
        await audit(req, { action: "project.phase", entity: "project", entityId: req.params.id, details: { phase: req.params.phase, progress: req.body.progress, invoiced: result.billed } })
        return result
      },
    )

    app.put<{ Params: { id: string; installmentId: string }; Body: { status: "pending" | "invoiced" | "paid" } }>(
      "/projects/:id/installments/:installmentId",
      { schema: setInstallmentSchema, preHandler: executives },
      async (req) => {
        const p = await repo.setInstallmentStatus(req.params.id, req.params.installmentId, req.body.status)
        if (!p) throw notFound("Installment")
        await audit(req, { action: "installment.status", entity: "project", entityId: req.params.id, details: { installment: req.params.installmentId, status: req.body.status } })
        return p
      },
    )

    app.post<{ Params: { id: string }; Body: Omit<ChangeOrderInput, "description" | "costImpact" | "daysImpact"> & Partial<ChangeOrderInput> }>(
      "/projects/:id/change-orders",
      { schema: addChangeOrderSchema, preHandler: projectEditors },
      async (req, reply) => {
        const b = req.body
        const p = await repo.addChangeOrder(req.params.id, {
          title: required(b.title, "title"),
          description: cleanText(b.description ?? ""),
          amount: b.amount,
          costImpact: b.costImpact ?? 0,
          daysImpact: b.daysImpact ?? 0,
          requestedBy: b.requestedBy,
        })
        if (!p) throw notFound("Project")
        await audit(req, { action: "change_order.created", entity: "project", entityId: req.params.id, details: { title: b.title, amount: b.amount } })
        return reply.status(201).send(p)
      },
    )

    app.put<{ Params: { id: string; coId: string }; Body: { status: "approved" | "rejected" } }>(
      "/projects/:id/change-orders/:coId",
      { schema: decideChangeOrderSchema, preHandler: executives },
      async (req) => {
        const p = await repo.decideChangeOrder(req.params.id, req.params.coId, req.body.status)
        if (!p) throw new AppError(404, "NOT_FOUND", "Pending change order not found")
        await audit(req, { action: `change_order.${req.body.status}`, entity: "project", entityId: req.params.id, details: { changeOrder: req.params.coId } })
        return p
      },
    )

    // Members: who may log hours on the project (executives, or the Leader who created it)
    app.put<{ Params: { id: string; employeeId: string } }>(
      "/projects/:id/members/:employeeId",
      { schema: memberSchema, preHandler: projectEditors },
      async (req) => {
        const res = await members.add(req.params.id, req.params.employeeId)
        if (res === "no-project") throw notFound("Project")
        if (res === "no-employee") throw notFound("Employee")
        if (res === "added") await audit(req, { action: "project.member_added", entity: "project", entityId: req.params.id, details: { employeeId: req.params.employeeId } })
        return await repo.findOne(req.params.id)
      },
    )

    app.delete<{ Params: { id: string; employeeId: string } }>(
      "/projects/:id/members/:employeeId",
      { schema: memberSchema, preHandler: projectEditors },
      async (req) => {
        // Hours already logged stay; the person just cannot log new ones on this project
        if (await members.remove(req.params.id, req.params.employeeId)) {
          await audit(req, { action: "project.member_removed", entity: "project", entityId: req.params.id, details: { employeeId: req.params.employeeId } })
        }
        return await repo.findOne(req.params.id)
      },
    )
  }
}
