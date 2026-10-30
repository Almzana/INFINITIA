import type { TagType } from "@/components/shared/tag"
import { t } from "@/i18n"
import { AUDIT_ENTITIES } from "@/lib/audit-api"

const KNOWN_ACTIONS = new Set([
  "login.success", "login.failed", "login.locked",
  "password.changed", "password.reset_requested", "password.reset", "profile.updated",
  "employee.created", "employee.updated", "employee.deleted", "account.password_set", "photo.updated", "photo.removed",
  "leave.requested", "leave.approved", "leave.rejected",
  "project.created", "project.phase", "installment.status",
  "change_order.created", "change_order.approved", "change_order.rejected",
  "announcement.created", "announcement.updated", "announcement.deleted",
])

const SECURITY_ACTIONS = new Set(["login.failed", "login.locked", "account.password_set", "employee.deleted"])
const DANGER_ACTIONS = new Set(["login.locked", "employee.deleted"])

const KNOWN_FIELDS = new Set([
  "salary", "status", "position", "department", "email", "phone", "managerId", "nickname",
  "firstName", "lastName", "role", "address", "birthDate", "startDate", "code", "login",
])

/** Translated action name; unknown actions fall back to the raw string. */
export const actionLabel = (action: string) => (KNOWN_ACTIONS.has(action) ? t(`audit.action.${action}`) : action)

export const entityLabel = (entity: string) =>
  (AUDIT_ENTITIES as readonly string[]).includes(entity) ? t(`audit.entity.${entity}`) : entity

export const fieldLabel = (field: string) => (KNOWN_FIELDS.has(field) ? t(`audit.field.${field}`) : field)

export const isSecurityAction = (action: string) => SECURITY_ACTIONS.has(action) || action.startsWith("password.")

/** Tag colour: red for lockouts / deletions, amber for other security events. */
export function actionTone(action: string): TagType {
  if (DANGER_ACTIONS.has(action)) return "danger"
  if (isSecurityAction(action)) return "warning"
  if (action.endsWith(".rejected") || action.endsWith(".deleted") || action.endsWith(".removed")) return "danger"
  if (action.endsWith(".approved") || action.endsWith(".created") || action === "login.success") return "success"
  return "primary"
}
