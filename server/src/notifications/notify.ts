import type { FastifyBaseLogger, FastifyRequest } from "fastify"
import type { Client, Pool } from "../db.ts"

export interface Notice {
  type: string
  params?: Record<string, string | number | null>
  link?: string
}

/** Who should receive it. Every target skips the actor and anyone whose employee record is resigned. */
export type Recipients =
  | { userIds: string[] }
  | { roles: ("executive" | "hr" | "staff")[] }
  | { employeeIds: string[] }
  | { email: string }
  | { everyone: true }
  /** Accounts flagged as developers (Developer Console alerts) */
  | { developers: true }

let pool: Pool | null = null
export function initNotifications(p: Pool) {
  pool = p
}

/**
 * Insert one notification per recipient in a single set-based statement. Pass `db` to join the
 * caller's transaction. A failure outside a transaction is logged, never breaks the action itself.
 */
export async function notify(req: FastifyRequest | null, to: Recipients, n: Notice, opts: { db?: Client | Pool; log?: FastifyBaseLogger } = {}) {
  const db = opts.db ?? pool
  if (!db) return
  const actor = req?.user ?? null
  const where: string[] = []
  const params: unknown[] = [n.type, JSON.stringify(n.params ?? {}), n.link ?? null, actor?.name ?? null, actor?.id ?? null]
  if ("userIds" in to) where.push(`u.id = ANY($${params.push(to.userIds)})`)
  else if ("roles" in to) where.push(`u.role = ANY($${params.push(to.roles)})`)
  else if ("employeeIds" in to) where.push(`u.id IN (SELECT user_id FROM employees WHERE id = ANY($${params.push(to.employeeIds)}) AND user_id IS NOT NULL)`)
  else if ("email" in to) where.push(`u.email = $${params.push(to.email)}`)
  else if ("developers" in to) where.push("u.is_developer")
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, params, link, actor_name)
       SELECT u.id, $1, $2::jsonb, $3, $4 FROM users u
        WHERE u.id IS DISTINCT FROM $5
          AND NOT EXISTS (SELECT 1 FROM employees r WHERE r.user_id = u.id AND r.status = 'resigned')
          ${where.length ? `AND ${where.join(" AND ")}` : ""}`,
      params,
    )
  } catch (err) {
    if (opts.db) throw err
    // Calls without a request (e.g. alerts) pass their own logger so failures are never silent
    ;(req?.log ?? opts.log)?.error({ err, type: n.type }, "notification insert failed")
  }
}

/**
 * A different notice per employee (e.g. each requester hears about their own leave) in one
 * statement instead of one insert per item. Same skips as `notify`.
 */
export async function notifyEach(req: FastifyRequest | null, items: { employeeId: string; notice: Notice }[]) {
  if (!pool || items.length === 0) return
  const actor = req?.user ?? null
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, params, link, actor_name)
       SELECT e.user_id, x.type, x.params::jsonb, x.link, $5
         FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) AS x(employee_id, type, params, link)
         JOIN employees e ON e.id = x.employee_id AND e.user_id IS NOT NULL AND e.status <> 'resigned'
        WHERE e.user_id IS DISTINCT FROM $6`,
      [
        items.map((i) => i.employeeId),
        items.map((i) => i.notice.type),
        items.map((i) => JSON.stringify(i.notice.params ?? {})),
        items.map((i) => i.notice.link ?? null),
        actor?.name ?? null,
        actor?.id ?? null,
      ],
    )
  } catch (err) {
    req?.log.error({ err, count: items.length }, "notification insert failed")
  }
}

/** Retention: read notifications go after 90 days, unread ones after a year. Hourly, never throws. */
export function scheduleNotificationCleanup(onClose: (fn: () => void) => void, log: FastifyBaseLogger) {
  const run = () => {
    if (!pool) return
    pool
      .query("DELETE FROM notifications WHERE (read_at IS NOT NULL AND created_at < now() - interval '90 days') OR created_at < now() - interval '365 days'")
      .catch((err) => log.error({ err }, "notification cleanup failed"))
  }
  const timer = setInterval(run, 60 * 60 * 1000)
  timer.unref()
  onClose(() => clearInterval(timer))
}
