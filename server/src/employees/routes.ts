import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { currentUser, isPrivileged, requireRole } from "../auth/guard.ts"
import { audit, diff } from "../audit/audit.ts"
import { hashPassword } from "../auth/password.ts"
import type { AuthUser, Role } from "../auth/repository.ts"
import { AppError, conflictFrom, forbidden, notFound } from "../errors.ts"
import type { EmployeeRepository } from "./repository.ts"
import { cleanUsername, sanitizeEmployee } from "./sanitize.ts"
import { createEmployeeSchema, deleteEmployeesSchema, listEmployeesSchema, setAccountSchema, updateEmployeeSchema } from "./schemas.ts"
import type { Account, CreateEmployeeBody, EmployeeInput, ListFilters } from "./types.ts"

type IdParams = { id: string }

// Unique constraint -> API field, for 409 responses
const UNIQUE_FIELDS = {
  users_username_key: "username",
  users_email_key: "email",
  employees_email_key: "email",
  employees_code_key: "code",
}

/** HR may grant staff/hr; only executives may grant executive. */
function assertCanGrant(caller: AuthUser, role: Role | undefined) {
  if (role === "executive" && caller.role !== "executive") throw forbidden()
}

// Fields nobody but an executive may change on their *own* record (pay, standing, reporting line)
const SELF_LOCKED: (keyof EmployeeInput)[] = ["salary", "status", "managerId", "position", "department", "startDate", "code"]

/**
 * Who a non-executive manager (HR) may act on: never an executive's record or account,
 * and never their own pay / status / reporting line. Executives may act on anyone.
 */
export async function assertCanManage(repo: EmployeeRepository, caller: AuthUser, ids: string[], patch?: Partial<EmployeeInput>) {
  if (caller.role === "executive") return
  const targets = await repo.targets(ids)
  if (targets.some((t) => t.role === "executive")) throw forbidden()
  const self = targets.find((t) => t.userId === caller.id)
  if (self && patch && SELF_LOCKED.some((k) => patch[k] !== undefined)) {
    throw new AppError(403, "FORBIDDEN", "You cannot change your own pay, status or reporting line")
  }
}

async function mapConflict<T>(p: Promise<T>): Promise<T> {
  try {
    return await p
  } catch (err) {
    const code = (err as { code?: string }).code
    // Unknown leader id (FK) or leader = self (CHECK)
    if (code === "23503" || code === "23514") throw new AppError(400, "VALIDATION_ERROR", "Invalid team leader", [{ field: "managerId" }])
    throw conflictFrom(err, UNIQUE_FIELDS) ?? err
  }
}

export function employeeRoutes(repo: EmployeeRepository, authenticate: preHandlerHookHandler) {
  const managers = requireRole("hr", "executive")

  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)

    // Everyone signed in can see the directory; salary/personal/account fields only for HR & executives
    app.get<{ Querystring: ListFilters }>("/employees", { schema: listEmployeesSchema }, async (req) => {
      const { q, department, status, page, pageSize } = req.query
      const filters = { q: q?.trim() || undefined, department: department?.trim() || undefined, status, page, pageSize }
      const { employees, total } = await repo.list(filters, isPrivileged(currentUser(req)))
      return { data: employees, meta: { page, pageSize, total } }
    })

    app.post<{ Body: CreateEmployeeBody }>(
      "/employees",
      { schema: createEmployeeSchema, preHandler: managers },
      async (req, reply) => {
        const { account, ...fields } = req.body
        const role = account.role ?? "staff"
        assertCanGrant(currentUser(req), role)
        const input: EmployeeInput = sanitizeEmployee({
          nickname: "",
          phone: "",
          status: "probation",
          salary: 0,
          birthDate: null,
          address: null,
          emergencyName: null,
          emergencyPhone: null,
          managerId: null,
          ...fields,
        })
        const created = await mapConflict(
          repo.create(input, { username: cleanUsername(account.username), role, passwordHash: await hashPassword(account.password) }),
        )
        await audit(req, { action: "employee.created", entity: "employee", entityId: created?.id, details: { code: input.code, name: `${input.firstName} ${input.lastName}`, username: cleanUsername(account.username), role } })
        return reply.status(201).send(created)
      },
    )

    app.patch<{ Params: IdParams; Body: Partial<EmployeeInput> }>(
      "/employees/:id",
      { schema: updateEmployeeSchema, preHandler: managers },
      async (req) => {
        await assertCanManage(repo, currentUser(req), [req.params.id], req.body)
        const before = await repo.get(req.params.id)
        const updated = await mapConflict(repo.update(req.params.id, sanitizeEmployee(req.body)))
        if (!updated) throw notFound("Employee")
        // Field-level before/after, e.g. salary 30000 -> 35000
        await audit(req, { action: "employee.updated", entity: "employee", entityId: req.params.id, details: { code: updated.code, changes: diff(before, updated) } })
        return updated
      },
    )

    app.delete<{ Querystring: { ids: string[] } }>(
      "/employees",
      { schema: deleteEmployeesSchema, preHandler: managers },
      async (req) => {
        await assertCanManage(repo, currentUser(req), req.query.ids)
        const gone = await repo.labels(req.query.ids)
        const deleted = await repo.remove(req.query.ids, currentUser(req).id)
        await audit(req, { action: "employee.deleted", entity: "employee", entityId: req.query.ids.join(","), details: { employees: gone } })
        return { deleted }
      },
    )

    // Set username / password (creates the account if the employee has none yet)
    app.put<{ Params: IdParams; Body: Partial<Account> & { password: string } }>(
      "/employees/:id/account",
      { schema: setAccountSchema, preHandler: managers },
      async (req) => {
        const { username, password, role } = req.body
        assertCanGrant(currentUser(req), role)
        // Resetting an executive's password (or demoting them) would hand over their account
        await assertCanManage(repo, currentUser(req), [req.params.id])
        const updated = await mapConflict(
          repo.setAccount(req.params.id, {
            username: username ? cleanUsername(username) : undefined,
            role,
            passwordHash: await hashPassword(password),
          }),
        )
        if (!updated) throw notFound("Employee")
        await audit(req, { action: "account.password_set", entity: "employee", entityId: req.params.id, details: { username: updated.username, role: role ?? null } })
        return updated
      },
    )
  }
}
