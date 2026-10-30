import type { FastifyReply, FastifyRequest } from "fastify"
import { AppError, forbidden } from "../errors.ts"
import type { AuthRepository, AuthUser, Role } from "./repository.ts"

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

export const SESSION_COOKIE = "sid"

export const unauthorized = () => new AppError(401, "UNAUTHORIZED", "Please sign in")

/**
 * preHandler: resolves the session cookie to a user or rejects with 401. Users who still have to
 * replace a password set by HR get 403 PASSWORD_CHANGE_REQUIRED everywhere except the few routes
 * that pass allowPendingPassword (who-am-I, change password, sign out).
 */
export function requireUser(repo: AuthRepository, opts: { allowPendingPassword?: boolean } = {}) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const token = req.cookies[SESSION_COOKIE]
    if (!token || token.length > 128) throw unauthorized()
    const user = await repo.findUserBySession(token)
    if (!user) throw unauthorized()
    req.user = user
    if (user.mustChangePassword && !opts.allowPendingPassword) {
      throw new AppError(403, "PASSWORD_CHANGE_REQUIRED", "Please set a new password first")
    }
  }
}

/** preHandler (after requireUser): only the given roles may continue, others get 403. */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden()
  }
}

/** preHandler (after requireUser): Developer Console only, whatever the role. */
export async function requireDeveloper(req: FastifyRequest) {
  if (!req.user?.isDeveloper) throw forbidden()
}

/** HR and executives manage employee records and accounts. */
export const isPrivileged = (user: AuthUser) => user.role === "hr" || user.role === "executive"

/** Narrow req.user after requireUser has run. */
export function currentUser(req: FastifyRequest): AuthUser {
  if (!req.user) throw unauthorized()
  return req.user
}
