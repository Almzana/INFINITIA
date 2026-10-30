import type { TagType } from "@/components/shared/tag"
import type { Employee, EmployeeStatus } from "@/data/mock"
import type { Role } from "@/lib/auth"
import type { EmployeeInput } from "@/lib/employees-api"
import { todayISO } from "@/lib/format"
import { t } from "@/i18n"

export const statusTag: Record<EmployeeStatus, TagType> = {
  active: "success",
  probation: "primary",
  leave: "warning",
  resigned: "info",
}

/** Form state: optional text fields are "" while editing and become null when sent. */
export interface EmployeeFormValues {
  code: string
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  department: string
  position: string
  status: EmployeeStatus
  startDate: string
  salary: number
  birthDate: string
  address: string
  emergencyName: string
  emergencyPhone: string
  /** "" = no team leader */
  managerId: string
}

export interface AccountFormValues {
  username: string
  password: string
  confirm: string
  role: Role
}

export type FormErrors = Partial<Record<keyof EmployeeFormValues | keyof AccountFormValues, string>>

export const emptyAccount: AccountFormValues = { username: "", password: "", confirm: "", role: "staff" }

export function toFormValues(e: Employee | null, nextCode: string): EmployeeFormValues {
  return {
    code: e?.code ?? nextCode,
    firstName: e?.firstName ?? "",
    lastName: e?.lastName ?? "",
    nickname: e?.nickname ?? "",
    email: e?.email ?? "",
    phone: e?.phone ?? "",
    department: e?.department ?? "",
    position: e?.position ?? "",
    status: e?.status ?? "probation",
    // Local date (Bangkok), not UTC
    startDate: e?.startDate ?? todayISO(),
    salary: e?.salary ?? 25000,
    birthDate: e?.birthDate ?? "",
    address: e?.address ?? "",
    emergencyName: e?.emergencyName ?? "",
    emergencyPhone: e?.emergencyPhone ?? "",
    managerId: e?.managerId ?? "",
  }
}

export function toInput(v: EmployeeFormValues): EmployeeInput {
  const orNull = (s: string) => (s.trim() ? s.trim() : null)
  return {
    ...v,
    code: v.code.trim().toUpperCase(),
    email: v.email.trim().toLowerCase(),
    birthDate: v.birthDate || null,
    address: orNull(v.address),
    emergencyName: orNull(v.emergencyName),
    emergencyPhone: orNull(v.emergencyPhone),
    managerId: v.managerId || null,
  }
}

/** Next free code after the highest existing EMPxxxx. */
export function nextEmployeeCode(employees: Employee[]) {
  const max = Math.max(1000, ...employees.map((e) => Number(e.code.replace(/\D/g, "")) || 0))
  return `EMP${max + 1}`
}

const PHONE = /^[0-9+()\-\s]*$/
export const USERNAME = /^[A-Za-z0-9._-]{2,32}$/

/** Mirrors the API's rules so most mistakes are caught before a round trip. */
export function validateEmployee(v: EmployeeFormValues): FormErrors {
  const e: FormErrors = {}
  if (!/^[A-Za-z0-9-]{1,20}$/.test(v.code.trim())) e.code = t("employees.error.code")
  if (!v.firstName.trim()) e.firstName = t("employees.error.firstName")
  if (!v.lastName.trim()) e.lastName = t("employees.error.lastName")
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = t("employees.error.email")
  if (!PHONE.test(v.phone)) e.phone = t("employees.error.phone")
  if (!PHONE.test(v.emergencyPhone)) e.emergencyPhone = t("employees.error.phone")
  if (!v.department) e.department = t("employees.error.department")
  if (!v.position.trim()) e.position = t("employees.error.position")
  if (!v.startDate) e.startDate = t("employees.error.startDate")
  if (!Number.isInteger(v.salary) || v.salary < 0) e.salary = t("employees.error.salary")
  return e
}

/** requireUsername: false when only resetting the password of an existing account. */
export function validateAccount(a: AccountFormValues, requireUsername: boolean): FormErrors {
  const e: FormErrors = {}
  if (requireUsername && !USERNAME.test(a.username.trim())) e.username = t("employees.error.username")
  if (a.password.length < 8) e.password = t("employees.error.password")
  if (a.confirm !== a.password) e.confirm = t("employees.error.confirm")
  return e
}

/** Server 409/400 details -> form field errors (translated messages). */
export function serverFieldErrors(details: { field?: string }[] | undefined): FormErrors {
  const messages: Record<string, [keyof FormErrors, string]> = {
    username: ["username", t("employees.error.usernameTaken")],
    email: ["email", t("employees.error.emailTaken")],
    code: ["code", t("employees.error.codeTaken")],
    managerId: ["managerId", t("employees.error.managerInvalid")],
  }
  const out: FormErrors = {}
  for (const d of details ?? []) {
    const hit = d.field && messages[d.field.replace(/^\/(account\/)?/, "")]
    if (hit) out[hit[0]] = hit[1]
  }
  return out
}
