import cookie from "@fastify/cookie"
import rateLimit from "@fastify/rate-limit"
import Fastify from "fastify"
import { createAnnouncementRepository } from "./announcements/repository.ts"
import { announcementRoutes } from "./announcements/routes.ts"
import { initAudit } from "./audit/audit.ts"
import { auditRoutes } from "./audit/routes.ts"
import { requireUser } from "./auth/guard.ts"
import { createAuthRepository } from "./auth/repository.ts"
import { authRoutes, type SessionOptions } from "./auth/routes.ts"
import type { Pool } from "./db.ts"
import { registerDocs } from "./docs.ts"
import { createAlerter } from "./dev/alerts.ts"
import { createMonitor } from "./dev/monitor.ts"
import { persistMonitor } from "./dev/stats-store.ts"
import { devRoutes } from "./dev/routes.ts"
import { createEmployeeRepository } from "./employees/repository.ts"
import { photoRoutes } from "./employees/photo-routes.ts"
import { employeeRoutes } from "./employees/routes.ts"
import { registerErrorHandlers } from "./errors.ts"
import { createLeaveRepository } from "./leaves/repository.ts"
import { createQuotaRepository } from "./leaves/quota-repository.ts"
import { quotaRoutes } from "./leaves/quota-routes.ts"
import { leaveRoutes } from "./leaves/routes.ts"
import { createMeetingRepository } from "./meetings/repository.ts"
import { initNotifications, scheduleNotificationCleanup } from "./notifications/notify.ts"
import { notificationRoutes } from "./notifications/routes.ts"
import { meetingRoutes } from "./meetings/routes.ts"
import { createProjectRepository } from "./projects/repository.ts"
import { createMemberRepository } from "./projects/members.ts"
import { projectRoutes } from "./projects/routes.ts"
import { createTaskRepository } from "./tasks/repository.ts"
import { taskRoutes } from "./tasks/routes.ts"
import { createTeamRepository } from "./team/repository.ts"
import { timesheetRoutes } from "./timesheet/routes.ts"
import { teamRoutes } from "./team/routes.ts"

/**
 * `docs` serves Swagger UI at /api/docs (on in development, opt-in in production via API_DOCS=true).
 * The Developer Console data (/api/dev/*) is always there, for developer accounts only.
 */
export async function buildApp(pool: Pool, session: SessionOptions, logLevel = "info", opts: { docs?: boolean; alertEmails?: boolean } = {}) {
  const app = Fastify({
    logger: { level: logLevel },
    bodyLimit: 64 * 1024,
    // Trust X-Forwarded-For only from local/private proxies (nginx in Docker) so rate limiting sees the real client IP
    trustProxy: "loopback, uniquelocal",
    ajv: { customOptions: { removeAdditional: true, coerceTypes: "array", useDefaults: true, allErrors: false } },
  })

  registerErrorHandlers(app)
  // Monitoring runs everywhere (5xx alerts matter most in production); hooks and the spec must exist
  // before the routes are registered so they cover all of them
  const monitor = createMonitor({ onServerError: createAlerter(pool, app.log, { email: opts.alertEmails ?? true }) })
  await registerDocs(app, { ui: !!opts.docs })
  monitor.install(app)
  persistMonitor(app, pool, monitor)
  app.decorateRequest("user", null)
  await app.register(cookie)
  // Opt-in per route (login); other routes are not limited
  await app.register(rateLimit, { global: false })

  app.get("/api/health", async () => {
    await pool.query("SELECT 1")
    return { status: "ok" }
  })

  initAudit(pool)
  initNotifications(pool)
  scheduleNotificationCleanup((fn) => app.addHook("onClose", async () => fn()), app.log)
  const authRepo = createAuthRepository(pool, session.idleMs)
  await app.register(authRoutes(authRepo, session), { prefix: "/api" })
  const teamRepo = createTeamRepository(pool)
  await app.register(taskRoutes(createTaskRepository(pool), teamRepo, requireUser(authRepo)), { prefix: "/api" })
  await app.register(teamRoutes(teamRepo, requireUser(authRepo)), { prefix: "/api" })
  await app.register(projectRoutes(createProjectRepository(pool), createMemberRepository(pool), teamRepo, requireUser(authRepo)), { prefix: "/api" })
  const employeeRepo = createEmployeeRepository(pool)
  await app.register(employeeRoutes(employeeRepo, requireUser(authRepo)), { prefix: "/api" })
  await app.register(photoRoutes(pool, employeeRepo, requireUser(authRepo)), { prefix: "/api" })
  await app.register(meetingRoutes(createMeetingRepository(pool), requireUser(authRepo)), { prefix: "/api" })
  await app.register(announcementRoutes(createAnnouncementRepository(pool), requireUser(authRepo)), { prefix: "/api" })
  await app.register(leaveRoutes(createLeaveRepository(pool), requireUser(authRepo)), { prefix: "/api" })
  await app.register(quotaRoutes(createQuotaRepository(pool), requireUser(authRepo)), { prefix: "/api" })
  await app.register(timesheetRoutes(pool, requireUser(authRepo)), { prefix: "/api" })
  await app.register(auditRoutes(pool, requireUser(authRepo)), { prefix: "/api" })
  await app.register(notificationRoutes(pool, requireUser(authRepo)), { prefix: "/api" })
  await app.register(devRoutes(pool, monitor, requireUser(authRepo)), { prefix: "/api" })

  return app
}
