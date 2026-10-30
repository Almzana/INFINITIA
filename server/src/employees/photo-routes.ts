import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify"
import { audit } from "../audit/audit.ts"
import { currentUser, isPrivileged } from "../auth/guard.ts"
import type { Pool } from "../db.ts"
import { AppError, forbidden, notFound } from "../errors.ts"
import type { EmployeeRepository } from "./repository.ts"
import { assertCanManage } from "./routes.ts"

const MAX_BYTES = 2 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const
type ImageType = (typeof TYPES)[number]

/** The declared type must match the file's real signature (never trust the header alone). */
function sniff(buf: Buffer): ImageType | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp"
  return null
}

const params = {
  type: "object",
  properties: { id: { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } },
  required: ["id"],
  additionalProperties: false,
} as const

type Req = FastifyRequest<{ Params: { id: string } }>

/**
 * Profile photos. Anyone signed in may view; you may change your own photo; HR and executives may
 * change others' (HR never an executive's — same rule as editing the record).
 */
export function photoRoutes(pool: Pool, repo: EmployeeRepository, authenticate: preHandlerHookHandler) {
  const canChange = async (req: Req) => {
    const u = currentUser(req)
    if (u.employeeId === req.params.id) return
    if (!isPrivileged(u)) throw forbidden()
    await assertCanManage(repo, u, [req.params.id])
  }

  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)
    // Raw image bodies, only inside this plugin (the rest of the API stays JSON-only with a 64 KB limit)
    app.addContentTypeParser([...TYPES], { parseAs: "buffer", bodyLimit: MAX_BYTES }, (_req, body, done) => done(null, body))

    app.get<{ Params: { id: string } }>("/employees/:id/photo", { schema: { params } }, async (req, reply) => {
      const { rows } = await pool.query<{ content_type: string; data: Buffer }>(
        "SELECT content_type, data FROM employee_photos WHERE employee_id = $1",
        [req.params.id],
      )
      if (!rows[0]) throw notFound("Photo")
      // URLs carry ?v=<version>, so the browser may cache; private because it is behind a login
      return reply
        .header("content-type", rows[0].content_type)
        .header("cache-control", "private, max-age=31536000, immutable")
        .header("x-content-type-options", "nosniff")
        .header("content-disposition", "inline")
        .send(rows[0].data)
    })

    app.put<{ Params: { id: string }; Body: Buffer }>(
      "/employees/:id/photo",
      { schema: { params }, preHandler: canChange, bodyLimit: MAX_BYTES },
      async (req) => {
        const declared = String(req.headers["content-type"] ?? "").split(";")[0].trim()
        const body = req.body
        if (!Buffer.isBuffer(body) || body.length === 0) throw new AppError(400, "VALIDATION_ERROR", "Send the image as the request body")
        const real = sniff(body)
        if (!real || real !== declared) throw new AppError(400, "INVALID_IMAGE", "Only JPEG, PNG or WebP images are accepted")
        const { rows } = await pool.query<{ v: number }>(
          `INSERT INTO employee_photos (employee_id, content_type, data) VALUES ($1, $2, $3)
           ON CONFLICT (employee_id) DO UPDATE SET content_type = EXCLUDED.content_type, data = EXCLUDED.data, updated_at = now()
           RETURNING floor(extract(epoch FROM updated_at) * 1000)::bigint AS v`,
          [req.params.id, real, body],
        ).catch((err) => {
          if ((err as { code?: string }).code === "23503") throw notFound("Employee")
          throw err
        })
        await audit(req, { action: "photo.updated", entity: "employee", entityId: req.params.id, details: { bytes: body.length, type: real } })
        return { photoVersion: rows[0].v }
      },
    )

    app.delete<{ Params: { id: string } }>("/employees/:id/photo", { schema: { params }, preHandler: canChange }, async (_req, reply) => {
      await pool.query("DELETE FROM employee_photos WHERE employee_id = $1", [_req.params.id])
      await audit(_req, { action: "photo.removed", entity: "employee", entityId: _req.params.id })
      return reply.status(204).send()
    })
  }
}
