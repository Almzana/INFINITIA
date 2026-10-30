import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { currentUser } from "../auth/guard.ts"
import type { Pool } from "../db.ts"

const listSchema = {
  querystring: {
    type: "object",
    properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 30 } },
    additionalProperties: false,
  },
} as const

const readSchema = {
  headers: {
    type: "object",
    properties: { "content-type": { type: "string", pattern: "^application/json" } },
    required: ["content-type"],
  },
  body: {
    type: "object",
    properties: {
      ids: { type: "array", items: { type: "integer", minimum: 1 }, minItems: 1, maxItems: 100, uniqueItems: true },
      all: { type: "boolean", const: true },
    },
    oneOf: [{ required: ["ids"] }, { required: ["all"] }],
    additionalProperties: false,
  },
} as const

/** The signed-in user's own notifications only — every query is filtered by their user id. */
export function notificationRoutes(pool: Pool, authenticate: preHandlerHookHandler) {
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    app.get<{ Querystring: { limit: number } }>("/notifications", { schema: listSchema }, async (req) => {
      const uid = currentUser(req).id
      const [list, count] = await Promise.all([
        pool.query(
          `SELECT id, type, params, link, actor_name AS "actorName", created_at AS "createdAt", read_at IS NOT NULL AS read
             FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
          [uid, req.query.limit],
        ),
        pool.query<{ n: number }>("SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL", [uid]),
      ])
      return { data: list.rows, unread: count.rows[0].n }
    })

    app.post<{ Body: { ids?: number[]; all?: true } }>("/notifications/read", { schema: readSchema }, async (req) => {
      const uid = currentUser(req).id
      const { rowCount } = req.body.all
        ? await pool.query("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", [uid])
        : await pool.query("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND id = ANY($2) AND read_at IS NULL", [uid, req.body.ids])
      return { updated: rowCount ?? 0 }
    })
  }
}
