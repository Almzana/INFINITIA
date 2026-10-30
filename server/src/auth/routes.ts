import type { FastifyInstance } from "fastify"
import { audit } from "../audit/audit.ts"
import { AppError } from "../errors.ts"
import { appUrl, resetEmail, sendMail } from "../mail.ts"
import { cleanEmail, cleanText } from "../tasks/sanitize.ts"
import { currentUser, requireUser, SESSION_COOKIE } from "./guard.ts"
import { clearFailures, lockedFor, recordFailure } from "./lockout.ts"
import { DUMMY_HASH, hashPassword, passwordProblem, verifyPassword } from "./password.ts"
import type { AuthRepository } from "./repository.ts"
import { changePasswordSchema, forgotSchema, loginSchema, meSchema, profileSchema, resetSchema } from "./schemas.ts"

export interface SessionOptions {
  ttlMs: number
  idleMs: number
  secureCookie: boolean
}

const RESET_MINUTES = 30

function weak(code: string | null) {
  if (code) throw new AppError(400, "WEAK_PASSWORD", `Password rejected: ${code}`, [{ field: "newPassword", message: code }])
}

export function authRoutes(repo: AuthRepository, opts: SessionOptions) {
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: opts.secureCookie, path: "/api" }
  // Pages that must work while a new password is still required
  const pendingOk = requireUser(repo, { allowPendingPassword: true })

  return async (app: FastifyInstance) => {
    app.post<{ Body: { login: string; password: string } }>(
      "/auth/login",
      { schema: loginSchema, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
      async (req, reply) => {
        const login = cleanEmail(req.body.login)
        const found = await repo.findByLogin(login)
        // Count per account (username and email are the same person), per name for unknown logins
        const lockKey = found ? `user:${found.id}` : `login:${login}`
        const wait = lockedFor(lockKey)
        if (wait) {
          await audit(req, { action: "login.locked", entity: "user", details: { login } }, { actorName: login })
          reply.header("retry-after", Math.ceil(wait / 1000))
          throw new AppError(429, "ACCOUNT_LOCKED", "Too many failed attempts for this account, try again later")
        }
        // Count the attempt before the (slow) hash check, so parallel guesses cannot all slip under
        // the limit; a successful sign-in clears it below
        recordFailure(lockKey)
        // Always run one hash check so unknown emails take as long as wrong passwords
        const ok = await verifyPassword(req.body.password, found?.passwordHash ?? DUMMY_HASH)
        if (!found || !ok) {
          await audit(req, { action: "login.failed", entity: "user", entityId: found?.id, details: { login } }, { actorName: login })
          throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect")
        }

        clearFailures(lockKey)
        const token = await repo.createSession(found.id, opts.ttlMs)
        reply.setCookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: Math.floor(opts.ttlMs / 1000) })
        const { passwordHash: _hash, ...user } = found
        req.user = user
        await audit(req, { action: "login.success", entity: "user", entityId: user.id })
        return { user }
      },
    )

    app.post("/auth/logout", async (req, reply) => {
      const token = req.cookies[SESSION_COOKIE]
      if (token && token.length <= 128) await repo.deleteSession(token)
      reply.clearCookie(SESSION_COOKIE, cookieOptions)
      return reply.status(204).send()
    })

    app.get("/auth/me", { schema: meSchema, preHandler: pendingOk }, async (req) => ({ user: currentUser(req) }))

    // Change my own password (also how a password set by HR gets replaced at first login)
    app.put<{ Body: { currentPassword: string; newPassword: string } }>(
      "/auth/password",
      { schema: changePasswordSchema, preHandler: pendingOk, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
      async (req, reply) => {
        const u = currentUser(req)
        const { currentPassword, newPassword } = req.body
        const hash = await repo.passwordHashOf(u.id)
        if (!hash || !(await verifyPassword(currentPassword, hash))) {
          throw new AppError(400, "WRONG_PASSWORD", "Current password is incorrect", [{ field: "currentPassword" }])
        }
        if (currentPassword === newPassword) weak("same")
        weak(passwordProblem(newPassword, u))
        await repo.setOwnPassword(u.id, await hashPassword(newPassword), req.cookies[SESSION_COOKIE] ?? null)
        await audit(req, { action: "password.changed", entity: "user", entityId: u.id })
        return reply.status(204).send()
      },
    )

    // Always 204 whether or not the account exists, so this cannot be used to discover accounts
    app.post<{ Body: { login: string } }>(
      "/auth/forgot",
      { schema: forgotSchema, config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
      async (req, reply) => {
        const login = cleanEmail(req.body.login)
        const found = await repo.findByLogin(login)
        await audit(req, { action: "password.reset_requested", entity: "user", entityId: found?.id, details: { login } }, { actorName: login })
        if (found) {
          const token = await repo.createResetToken(found.id, RESET_MINUTES * 60_000)
          const mail = resetEmail(found.name, `${appUrl}/reset-password?token=${token}`, RESET_MINUTES)
          // Send after replying would leak timing less, but a failed send must be logged either way
          await sendMail(req.log, { to: found.email, ...mail }).catch((err) => req.log.error({ err }, "reset email failed"))
        }
        return reply.status(204).send()
      },
    )

    app.post<{ Body: { token: string; newPassword: string } }>(
      "/auth/reset",
      { schema: resetSchema, config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
      async (req, reply) => {
        const { token, newPassword } = req.body
        // Length / letters+digits rules (the personal-info rule needs the account, unknown until the token is used)
        weak(passwordProblem(newPassword, { username: "", email: "@" }))
        const userId = await repo.resetWithToken(token, await hashPassword(newPassword))
        if (!userId) throw new AppError(400, "INVALID_TOKEN", "This reset link is invalid or has expired")
        await audit(req, { action: "password.reset", entity: "user", entityId: userId }, { actorName: "reset link" })
        return reply.status(204).send()
      },
    )

    // My own profile: only harmless fields (HR owns name, position, pay)
    app.patch<{ Body: { nickname?: string; phone?: string } }>(
      "/auth/profile",
      { schema: profileSchema, preHandler: requireUser(repo) },
      async (req) => {
        const u = currentUser(req)
        if (!u.employeeId) throw new AppError(400, "NO_EMPLOYEE_RECORD", "Your account is not linked to an employee record")
        // Unknown fields are stripped before this runs, so a body like { salary } arrives empty
        if (req.body.nickname === undefined && req.body.phone === undefined) {
          throw new AppError(400, "VALIDATION_ERROR", "Only nickname and phone can be changed here")
        }
        const patch = {
          nickname: req.body.nickname === undefined ? undefined : cleanText(req.body.nickname),
          phone: req.body.phone === undefined ? undefined : req.body.phone.trim(),
        }
        const saved = await repo.updateOwnProfile(u.employeeId, patch)
        await audit(req, { action: "profile.updated", entity: "employee", entityId: u.employeeId, details: patch })
        return saved
      },
    )
  }
}
