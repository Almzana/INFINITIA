import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify"
import { currentUser, isPrivileged } from "../auth/guard.ts"
import { AppError, forbidden, notFound } from "../errors.ts"
import { notify } from "../notifications/notify.ts"
import { cleanOptionalText, cleanText } from "../tasks/sanitize.ts"
import type { MeetingInput, MeetingRepository, Viewer } from "./repository.ts"
import { createMeetingSchema, deleteMeetingSchema, listMeetingsSchema, listRoomsSchema, updateMeetingSchema } from "./schemas.ts"

type IdParams = { id: string }

type MeetingLike = { title: string; date: string; start: string; end: string; roomId: string }
const meetingNotice = (type: string, id: string, m: MeetingLike) => ({
  type,
  params: { title: m.title, date: m.date, start: m.start, end: m.end, room: m.roomId },
  link: `/rooms?date=${m.date}&meeting=${id}`,
})
const MAX_RANGE_DAYS = 92

const viewer = (req: FastifyRequest): Viewer => {
  const u = currentUser(req)
  return { userId: u.id, privileged: isPrivileged(u) }
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

/** Postgres errors that are the caller's fault -> clear 4xx responses. */
async function mapDbErrors<T>(p: Promise<T>): Promise<T> {
  try {
    return await p
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "23P01") throw new AppError(409, "ROOM_TAKEN", "The room is already booked at that time", [{ field: "start" }])
    if (code === "23503") throw new AppError(400, "VALIDATION_ERROR", "Unknown room or attendee", [{ field: "attendeeIds" }])
    if (code === "23514") throw new AppError(400, "VALIDATION_ERROR", "end must be after start", [{ field: "end" }])
    throw err
  }
}

function cleanTitle(title: string) {
  const t = cleanText(title)
  if (!t) throw new AppError(400, "VALIDATION_ERROR", "title must not be empty", [{ field: "title" }])
  return t
}

export function meetingRoutes(repo: MeetingRepository, authenticate: preHandlerHookHandler) {
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    app.get("/rooms", { schema: listRoomsSchema }, async () => ({ data: await repo.listRooms() }))

    app.get<{ Querystring: { from: string; to: string } }>("/meetings", { schema: listMeetingsSchema }, async (req) => {
      const { from, to } = req.query
      const days = (Date.parse(to) - Date.parse(from)) / 86_400_000
      if (days < 0 || days > MAX_RANGE_DAYS) throw new AppError(400, "VALIDATION_ERROR", `Range must be 0–${MAX_RANGE_DAYS} days`)
      return { data: await repo.list(from, to, viewer(req)) }
    })

    // Any signed-in user can book; they become the organizer
    app.post<{ Body: Omit<MeetingInput, "minutes"> }>("/meetings", { schema: createMeetingSchema }, async (req, reply) => {
      const b = req.body
      if (toMin(b.end) <= toMin(b.start)) throw new AppError(400, "VALIDATION_ERROR", "end must be after start", [{ field: "end" }])
      const u = currentUser(req)
      const created = await mapDbErrors(
        repo.create(
          { ...b, title: cleanTitle(b.title), agenda: cleanOptionalText(b.agenda) ?? null, attendeeIds: b.attendeeIds ?? [] },
          { userId: u.id, name: u.name },
          viewer(req),
        ),
      )
      if (created?.attendeeIds?.length) {
        await notify(req, { employeeIds: created.attendeeIds }, meetingNotice("meeting.invited", created.id, created))
      }
      return reply.status(201).send(created)
    })

    // Organizer, HR or executives can edit (incl. writing the minutes after the meeting)
    app.patch<{ Params: IdParams; Body: Partial<MeetingInput> }>("/meetings/:id", { schema: updateMeetingSchema }, async (req) => {
      const b = req.body
      const before = await repo.summary(req.params.id)
      if (b.start && b.end && toMin(b.end) <= toMin(b.start)) throw new AppError(400, "VALIDATION_ERROR", "end must be after start", [{ field: "end" }])
      const result = await mapDbErrors(
        repo.update(
          req.params.id,
          {
            ...b,
            title: b.title === undefined ? undefined : cleanTitle(b.title),
            agenda: b.agenda === undefined ? undefined : (cleanOptionalText(b.agenda) ?? null),
            // Minutes keep line breaks; only control chars/tags are stripped
            minutes: b.minutes === undefined ? undefined : (cleanOptionalText(b.minutes) ?? null),
          },
          viewer(req),
        ),
      )
      if (result === "not_found") throw notFound("Meeting")
      if (result === "forbidden") throw forbidden()
      if (before) {
        const now = new Set<string>(result.attendeeIds ?? [])
        const was = new Set(before.attendeeIds)
        const added = [...now].filter((x) => !was.has(x))
        const removed = [...was].filter((x) => !now.has(x))
        const moved = before.date !== result.date || before.start !== result.start || before.end !== result.end || before.roomId !== result.roomId
        if (added.length) await notify(req, { employeeIds: added }, meetingNotice("meeting.invited", req.params.id, result))
        if (removed.length) await notify(req, { employeeIds: removed }, meetingNotice("meeting.uninvited", req.params.id, result))
        const stay = [...now].filter((x) => was.has(x))
        if (moved && stay.length) await notify(req, { employeeIds: stay }, meetingNotice("meeting.changed", req.params.id, result))
      }
      return result
    })

    app.delete<{ Params: IdParams }>("/meetings/:id", { schema: deleteMeetingSchema }, async (req, reply) => {
      const before = await repo.summary(req.params.id)
      const result = await repo.remove(req.params.id, viewer(req))
      if (result === "not_found") throw notFound("Meeting")
      if (result === "forbidden") throw forbidden()
      if (before?.attendeeIds.length) {
        // The meeting is gone, so the link only opens that day's timetable
        await notify(req, { employeeIds: before.attendeeIds }, { type: "meeting.cancelled", params: { title: before.title, date: before.date, start: before.start, end: before.end }, link: `/rooms?date=${before.date}` })
      }
      return reply.status(204).send()
    })
  }
}
