import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import type { FastifyInstance } from "fastify"
import { SUMMARIES } from "./docs-summaries.ts"

/** Routes anyone may call; every other route needs the `sid` session cookie. */
const PUBLIC = new Set(["/api/health", "/api/auth/login", "/api/auth/logout", "/api/auth/forgot", "/api/auth/reset"])

const TAG_INFO: Record<string, string> = {
  auth: "Sign in / out, own profile and password",
  tasks: "Personal to-do list; leaders assign tasks to their team",
  team: "The signed-in leader's direct reports",
  projects: "Projects, milestones and change orders",
  employees: "Employee records (HR / executives manage) and profile photos",
  rooms: "Meeting rooms",
  meetings: "Room bookings and meeting minutes",
  announcements: "Company announcements (HR / executives publish)",
  leaves: "Leave requests, Leader → HR approval, balances and policy",
  holidays: "Company holiday calendar (not counted as working days)",
  timesheet: "Hours logged per project",
  audit: "Who changed what (executives only)",
  notifications: "The signed-in user's own notifications",
  health: "Liveness check",
  dev: "Developer console data (dev / test environments only)",
}

/**
 * OpenAPI 3 document built from the JSON schemas the routes already validate with (always: the
 * Developer Console reads it via /api/dev/spec), plus Swagger UI at /api/docs (raw spec at
 * /api/docs/json) only when `ui` is set. Must be registered before the routes.
 * Tags and the cookie requirement are filled in per route from its URL so routes stay unchanged.
 */
export async function registerDocs(app: FastifyInstance, opts: { ui: boolean }) {
  app.addHook("onRoute", (route) => {
    if (!route.url.startsWith("/api/") || route.url.startsWith("/api/docs")) return
    const tag = route.url.split("/")[2]
    const schema = { ...(route.schema ?? {}) } as Record<string, unknown>
    schema.tags ??= [tag]
    const methods = Array.isArray(route.method) ? route.method : [route.method]
    schema.summary ??= SUMMARIES[`${methods[0]} ${route.url}`]
    if (!PUBLIC.has(route.url)) schema.security ??= [{ sessionCookie: [] }]
    route.schema = schema
  })

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "INFINI I.A. Internal Portal API",
        version: "1.0.0",
        description:
          "Sign in with `POST /api/auth/login`; the browser then keeps the httpOnly `sid` cookie and Swagger UI sends it with every " +
          "\"Try it out\" request. Errors always look like `{ \"error\": { \"code\", \"message\", \"details?\" } }`. " +
          "What a role may see or change is enforced by the server on every call (403 otherwise).",
      },
      tags: Object.entries(TAG_INFO).map(([name, description]) => ({ name, description })),
      components: { securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "sid" } } },
    },
  })
  if (!opts.ui) return
  await app.register(swaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: { docExpansion: "list", deepLinking: true, persistAuthorization: false, withCredentials: true },
  })
}
