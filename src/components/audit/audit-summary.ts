import { leaveTypeLabel, type LeaveType } from "@/data/mock"
import { getLang, t } from "@/i18n"
import { formatCurrency, formatDate } from "@/lib/format"
import { fieldLabel } from "./audit-labels"

type Details = Record<string, unknown>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/

/** Human-readable scalar: numbers grouped, ISO dates localised, objects as compact JSON. */
export function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-"
  if (typeof v === "number") return v.toLocaleString(getLang() === "en" ? "en-US" : "th-TH")
  if (typeof v === "boolean") return String(v)
  if (typeof v === "string") return ISO_DATE.test(v) ? formatDate(v, v.length > 10 ? "d MMM yyyy HH:mm" : "d MMM yyyy") : v
  if (Array.isArray(v)) return v.map(formatValue).join(", ")
  return JSON.stringify(v)
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))
const list = (v: unknown) => (Array.isArray(v) ? v.map(str).join(", ") : str(v))
const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" · ")

const leaveType = (v: unknown) => (typeof v === "string" && v in leaveTypeLabel ? leaveTypeLabel[v as LeaveType] : str(v))
const role = (v: unknown) => (v === "executive" || v === "hr" || v === "staff" ? t(`common.role.${v}`) : str(v))

function changes(c: unknown): string {
  if (!c || typeof c !== "object") return ""
  return Object.entries(c as Record<string, unknown>)
    .map(([field, pair]) => {
      const [before, after] = Array.isArray(pair) ? pair : [undefined, pair]
      return `${fieldLabel(field)}: ${formatValue(before)} → ${formatValue(after)}`
    })
    .join(", ")
}

/** Fallback: compact `key: value` pairs. */
export const pairs = (d: Details) =>
  Object.entries(d)
    .map(([k, v]) => `${fieldLabel(k)}: ${formatValue(v)}`)
    .join(", ")

/** One-line summary of an audit row's details. */
export function summarize(action: string, d: Details | null | undefined): string {
  if (!d || typeof d !== "object" || Object.keys(d).length === 0) return ""
  if (action === "employee.updated") return join(str(d.code), changes(d.changes))
  if (action === "employee.created") return join(str(d.code), str(d.name), d.username ? `${str(d.username)} (${role(d.role)})` : false)
  if (action === "employee.deleted" && "employees" in d) return list(d.employees)
  if (action.startsWith("login.") && "login" in d) return str(d.login)
  if (action.startsWith("leave.")) {
    if ("count" in d) return t("audit.sum.count", { n: str(d.count) })
    const range = d.from ? (d.to && d.to !== d.from ? `${formatValue(d.from)} – ${formatValue(d.to)}` : formatValue(d.from)) : ""
    return join(d.type !== undefined && leaveType(d.type), range, d.days !== undefined && t("audit.sum.days", { n: str(d.days) }))
  }
  if (action === "project.phase") {
    const inv = Array.isArray(d.invoiced) && d.invoiced.length > 0 && t("audit.sum.invoiced", { list: list(d.invoiced) })
    return join(str(d.phase), d.progress !== undefined && t("audit.sum.progress", { n: str(d.progress) }), inv)
  }
  if (action === "installment.status") return join(str(d.installment), str(d.status))
  if (action.startsWith("change_order.")) {
    if ("changeOrder" in d) return str(d.changeOrder)
    return join(str(d.title), typeof d.amount === "number" && formatCurrency(d.amount))
  }
  if (action === "photo.updated" && typeof d.bytes === "number") {
    return join(t("audit.sum.size", { n: Math.max(1, Math.round(d.bytes / 1024)) }), str(d.type))
  }
  return pairs(d)
}
