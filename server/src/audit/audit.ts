import type { FastifyRequest } from "fastify"
import type { Client, Pool } from "../db.ts"

export interface AuditEntry {
  action: string
  entity: string
  entityId?: string | null
  details?: Record<string, unknown>
}

let pool: Pool | null = null

/** Called once at startup. */
export function initAudit(p: Pool) {
  pool = p
}

// Never store secrets in the trail, whatever a caller passes
const SECRET_KEYS = /pass(word)?|token|hash|secret/i
function scrub(details: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(details).filter(([k]) => !SECRET_KEYS.test(k)))
}

/**
 * Append one entry to audit_log. Pass `db` to write inside the caller's transaction (so the entry
 * commits or rolls back with the change). `actorName` overrides the actor for unauthenticated events
 * (e.g. the login name of a failed sign-in).
 */
export async function audit(req: FastifyRequest | null, entry: AuditEntry, opts: { db?: Client | Pool; actorName?: string } = {}) {
  const db = opts.db ?? pool
  if (!db) return
  const user = req?.user ?? null
  try {
    await db.query(
      `INSERT INTO audit_log (actor_user_id, actor_name, action, entity, entity_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user?.id ?? null,
        opts.actorName ?? user?.name ?? "anonymous",
        entry.action,
        entry.entity,
        entry.entityId ?? null,
        JSON.stringify(scrub(entry.details ?? {})),
        req?.ip ?? null,
      ],
    )
  } catch (err) {
    // Inside a transaction the caller must fail too; outside one, a lost audit row must not undo the action
    if (opts.db) throw err
    req?.log.error({ err, entry }, "audit write failed")
  }
}

/** Field-level diff of two records, e.g. { salary: [30000, 35000] }. */
export function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const changes: Record<string, [unknown, unknown]> = {}
  if (!before || !after) return changes
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changes[k] = [before[k] ?? null, after[k] ?? null]
  }
  return changes
}
