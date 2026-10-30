import type { FastifyBaseLogger } from "fastify"
import type { Pool } from "../db.ts"
import { appUrl, sendMail } from "../mail.ts"
import { notify } from "../notifications/notify.ts"
import type { FailedRequest } from "./monitor.ts"

const QUIET_MS = 10 * 60 * 1000

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Tells every developer account (bell + email) when a route answers 5xx. At most one alert per
 * route every 10 minutes; errors in that window are reported together when it ends. Never throws:
 * a failing alert is logged and the request it was about is unaffected.
 */
export function createAlerter(pool: Pool, log: FastifyBaseLogger, opts: { email?: boolean } = {}) {
  const last = new Map<string, { at: number; suppressed: number; lastFailure?: FailedRequest; timer?: NodeJS.Timeout }>()

  async function send(f: FailedRequest, count: number) {
    const params = { route: f.route, status: f.status, code: f.code, count }
    await notify(null, { developers: true }, { type: "dev.server_error", params, link: "/dev?tab=monitor" }, { log })
    if (opts.email === false) return
    const { rows } = await pool.query<{ email: string }>(
      `SELECT u.email FROM users u WHERE u.is_developer
          AND NOT EXISTS (SELECT 1 FROM employees r WHERE r.user_id = u.id AND r.status = 'resigned')`,
    )
    const link = `${appUrl}/dev?tab=monitor`
    const subject = `[INFINI I.A.] ${f.status} ${f.route}`
    const lines = [`${f.route} answered ${f.status}${f.code ? ` (${f.code})` : ""} at ${f.at}.`, count > 1 ? `${count} errors on this route since the last alert.` : "", `Request id: ${f.reqId}`, link]
    const text = lines.filter(Boolean).join("\n")
    const html = lines.filter(Boolean).map((l) => (l === link ? `<p><a href="${esc(link)}">${esc(link)}</a></p>` : `<p>${esc(l)}</p>`)).join("")
    await Promise.all(rows.map((r) => sendMail(log, { to: r.email, subject, text, html })))
  }

  const fire = (f: FailedRequest, count: number) => send(f, count).catch((err) => log.error({ err, route: f.route }, "server error alert failed"))

  return function onServerError(f: FailedRequest) {
    const now = Date.now()
    const prev = last.get(f.route)
    if (prev && now - prev.at < QUIET_MS) {
      prev.suppressed += 1
      prev.lastFailure = f
      // When the quiet period ends, report what happened in it even if no further error comes
      if (!prev.timer) {
        prev.timer = setTimeout(() => {
          const entry = last.get(f.route)
          if (entry) entry.timer = undefined
          if (!entry?.suppressed || !entry.lastFailure) return
          const count = entry.suppressed
          last.set(f.route, { at: Date.now(), suppressed: 0 })
          void fire(entry.lastFailure, count)
        }, QUIET_MS - (now - prev.at))
        prev.timer.unref()
      }
      return
    }
    // A new window: fold in anything still waiting from the previous one (its timer may not have run yet)
    if (prev?.timer) clearTimeout(prev.timer)
    last.set(f.route, { at: now, suppressed: 0 })
    void fire(f, 1 + (prev?.suppressed ?? 0))
  }
}
