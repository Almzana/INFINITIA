import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { currentUser, requireRole } from "../auth/guard.ts"
import { audit } from "../audit/audit.ts"
import { AppError, notFound } from "../errors.ts"
import { notify } from "../notifications/notify.ts"
import { cleanText } from "../tasks/sanitize.ts"
import type { AnnouncementInput, AnnouncementRepository, Category } from "./repository.ts"
import { createAnnouncementSchema, deleteAnnouncementSchema, listAnnouncementsSchema, updateAnnouncementSchema } from "./schemas.ts"

type IdParams = { id: string }

function cleanRequired(value: string, field: string) {
  const v = cleanText(value)
  if (!v) throw new AppError(400, "VALIDATION_ERROR", `${field} must not be empty`, [{ field }])
  return v
}

/** Everyone reads the feed; only HR and executives publish, edit, pin or delete. */
export function announcementRoutes(repo: AnnouncementRepository, authenticate: preHandlerHookHandler) {
  const managers = requireRole("hr", "executive")

  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    app.get<{ Querystring: { category?: Category; page: number; pageSize: number } }>(
      "/announcements",
      { schema: listAnnouncementsSchema },
      async (req) => {
        const { category, page, pageSize } = req.query
        const { items, total } = await repo.list({ category, page, pageSize })
        return { data: items, meta: { page, pageSize, total } }
      },
    )

    app.post<{ Body: Omit<AnnouncementInput, "category" | "pinned"> & Partial<AnnouncementInput> }>(
      "/announcements",
      { schema: createAnnouncementSchema, preHandler: managers },
      async (req, reply) => {
        const u = currentUser(req)
        const created = await repo.create(
          {
            title: cleanRequired(req.body.title, "title"),
            body: cleanRequired(req.body.body, "body"),
            category: req.body.category ?? "ทั่วไป",
            pinned: req.body.pinned ?? false,
          },
          // The source shown to readers is the author's department (e.g. "ฝ่ายบุคคล")
          { userId: u.id, name: u.department || u.name },
        )
        await audit(req, { action: "announcement.created", entity: "announcement", entityId: created.id, details: { title: created.title } })
        await notify(req, { everyone: true }, { type: "announcement.published", params: { title: created.title, category: created.category }, link: `/announcements?view=${created.id}` })
        return reply.status(201).send(created)
      },
    )

    app.patch<{ Params: IdParams; Body: Partial<AnnouncementInput> }>(
      "/announcements/:id",
      { schema: updateAnnouncementSchema, preHandler: managers },
      async (req) => {
        const b = req.body
        const updated = await repo.update(req.params.id, {
          ...b,
          title: b.title === undefined ? undefined : cleanRequired(b.title, "title"),
          body: b.body === undefined ? undefined : cleanRequired(b.body, "body"),
        })
        if (!updated) throw notFound("Announcement")
        await audit(req, { action: "announcement.updated", entity: "announcement", entityId: req.params.id, details: { fields: Object.keys(b) } })
        return updated
      },
    )

    app.delete<{ Params: IdParams }>(
      "/announcements/:id",
      { schema: deleteAnnouncementSchema, preHandler: managers },
      async (req, reply) => {
        if (!(await repo.remove(req.params.id))) throw notFound("Announcement")
        await audit(req, { action: "announcement.deleted", entity: "announcement", entityId: req.params.id })
        return reply.status(204).send()
      },
    )
  }
}
