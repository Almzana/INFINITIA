import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify"
import { currentUser } from "../auth/guard.ts"
import { AppError, forbidden, notFound } from "../errors.ts"
import { notify } from "../notifications/notify.ts"
import type { TeamRepository } from "../team/repository.ts"
import type { Actor, NewTask, Status, TaskPatch, TaskRepository } from "./repository.ts"
import { cleanOptionalText, cleanText } from "./sanitize.ts"
import { createTaskSchema, deleteTaskSchema, listTasksSchema, updateTaskSchema } from "./schemas.ts"

type IdParams = { id: string }
type ListQuery = { employeeId?: string; status?: Status; page: number; pageSize: number }
type CreateBody = Omit<NewTask, "assigneeEmail"> & { assigneeEmployeeId?: string }

function requireTitle(title: string) {
  const cleaned = cleanText(title)
  if (!cleaned) throw new AppError(400, "VALIDATION_ERROR", "title must not be empty")
  return cleaned
}

const actor = (req: FastifyRequest): Actor => {
  const u = currentUser(req)
  return { email: u.email, userId: u.id, isExecutive: u.role === "executive" }
}

/**
 * Tasks are scoped to the signed-in user: their own tasks, plus — for Leaders — tasks of their
 * direct reports (executives: anyone). A task the caller may not touch behaves like a missing one (404).
 */
export function taskRoutes(repo: TaskRepository, team: TeamRepository, authenticate: preHandlerHookHandler) {
  /** Email of the employee the caller may act for, or 403. */
  const memberEmail = async (req: FastifyRequest, employeeId: string) => {
    const member = await team.assignable(currentUser(req), employeeId)
    if (!member) throw forbidden()
    return member.email
  }

  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    app.get<{ Querystring: ListQuery }>("/tasks", { schema: listTasksSchema }, async (req) => {
      const { employeeId, status, page, pageSize } = req.query
      const email = employeeId ? await memberEmail(req, employeeId) : currentUser(req).email
      const { tasks, total } = await repo.list(email, { status, page, pageSize })
      return { data: tasks, meta: { page, pageSize, total } }
    })

    app.post<{ Body: CreateBody }>("/tasks", { schema: createTaskSchema }, async (req, reply) => {
      const { assigneeEmployeeId, ...body } = req.body
      const me = currentUser(req)
      const assigneeEmail = assigneeEmployeeId ? await memberEmail(req, assigneeEmployeeId) : me.email
      const assignedBy = assigneeEmail === me.email ? null : { userId: me.id, name: me.name }
      const task = await repo.create(
        {
          title: requireTitle(body.title),
          description: cleanOptionalText(body.description),
          assigneeEmail,
          dueDate: body.dueDate,
          priority: body.priority,
          projectId: cleanOptionalText(body.projectId),
        },
        assignedBy,
      )
      if (assignedBy) {
        await notify(req, { email: assigneeEmail }, { type: "task.assigned", params: { title: task.title, due: task.dueDate, priority: task.priority }, link: "/" })
      }
      return reply.status(201).send(task)
    })

    app.patch<{ Params: IdParams; Body: TaskPatch }>("/tasks/:id", { schema: updateTaskSchema }, async (req) => {
      const body = req.body
      const task = await repo.update(req.params.id, actor(req), {
        title: body.title === undefined ? undefined : requireTitle(body.title),
        description: cleanOptionalText(body.description),
        dueDate: body.dueDate,
        priority: body.priority,
        status: body.status,
        projectId: cleanOptionalText(body.projectId),
      })
      if (!task) throw notFound("Task")
      return task
    })

    app.delete<{ Params: IdParams }>("/tasks/:id", { schema: deleteTaskSchema }, async (req, reply) => {
      if (!(await repo.remove(req.params.id, actor(req)))) throw notFound("Task")
      return reply.status(204).send()
    })
  }
}
