import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { requireRole } from "../auth/guard.ts"
import type { Pool } from "../db.ts"

const querystring = {
  type: "object",
  properties: {
    entity: { type: "string", maxLength: 64, pattern: "^[a-z_]+$" },
    action: { type: "string", maxLength: 64, pattern: "^[a-z_.]+$" },
    q: { type: "string", maxLength: 100 },
    page: { type: "integer", minimum: 1, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 200, default: 50 },
  },
  additionalProperties: false,
} as const

type Query = { entity?: string; action?: string; q?: string; page: number; pageSize: number }

/** GET /api/audit — the activity trail, executives only (HR actions are part of what it records). */
export function auditRoutes(pool: Pool, authenticate: preHandlerHookHandler) {
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)
    app.addHook("preHandler", requireRole("executive"))

    app.get<{ Querystring: Query }>("/audit", { schema: { querystring } }, async (req) => {
      const { entity, action, q, page, pageSize } = req.query
      const params: unknown[] = []
      const where: string[] = []
      if (entity) where.push(`entity = $${params.push(entity)}`)
      if (action) where.push(`action = $${params.push(action)}`)
      if (q?.trim()) {
        const like = `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        where.push(`(actor_name ILIKE $${params.push(like)} OR entity_id ILIKE $${params.length} OR details::text ILIKE $${params.length})`)
      }
      params.push(pageSize, (page - 1) * pageSize)
      const { rows } = await pool.query(
        `SELECT id, at, actor_name AS "actorName", action, entity, entity_id AS "entityId", details, ip, count(*) OVER() AS total
           FROM audit_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY at DESC, id DESC
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return { data: rows.map(({ total: _t, ...r }) => r), meta: { page, pageSize, total: rows.length ? Number(rows[0].total) : 0 } }
    })
  }
}
