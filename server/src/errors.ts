import type { FastifyError, FastifyInstance } from "fastify"

/** An error that is safe to show to the client as-is. */
export class AppError extends Error {
  statusCode: number
  code: string
  details?: { field?: string; message?: string }[]

  constructor(statusCode: number, code: string, message: string, details?: { field?: string; message?: string }[]) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} not found`)
export const forbidden = () => new AppError(403, "FORBIDDEN", "You do not have permission to do this")

/** Turns a Postgres unique violation into a 409 naming the field, using a constraint -> field map. */
export function conflictFrom(err: unknown, fields: Record<string, string>): AppError | null {
  const pgErr = err as { code?: string; constraint?: string }
  if (pgErr?.code !== "23505" || !pgErr.constraint) return null
  const field = fields[pgErr.constraint]
  return new AppError(409, "CONFLICT", field ? `${field} is already in use` : "Value is already in use", field ? [{ field }] : undefined)
}

/**
 * Central error handler. Every error response has the shape
 * { error: { code, message, details? } } and never includes stack traces.
 */
export function registerErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err.validation) {
      req.log.info({ err: err.message }, "validation failed")
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request is invalid",
          details: err.validation.map((v) => ({ field: v.instancePath || v.params?.missingProperty, message: v.message })),
        },
      })
    }

    if (err instanceof AppError) {
      req.log.info({ code: err.code }, err.message)
      return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message, details: err.details } })
    }

    // Fastify's own client errors (bad JSON, unsupported media type, body too large, ...)
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      req.log.info({ code: err.code }, err.message)
      const fallback = err.statusCode === 429 ? "RATE_LIMITED" : "BAD_REQUEST"
      return reply.status(err.statusCode).send({ error: { code: err.code ?? fallback, message: err.message } })
    }

    req.log.error({ err }, "unhandled error")
    return reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } })
  })

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.url} not found` } })
  })
}
