import * as React from "react"
import { toast } from "sonner"
import type { Employee } from "@/data/mock"
import { ApiError } from "@/lib/api"
import {
  type AccountFormValues,
  emptyAccount,
  type EmployeeFormValues,
  type FormErrors,
  nextEmployeeCode,
  serverFieldErrors,
  toFormValues,
  toInput,
  validateAccount,
  validateEmployee,
} from "@/lib/employee-form"
import { employeesApi } from "@/lib/employees-api"
import { useStore } from "@/lib/store"
import { t } from "@/i18n"

/** Shared API error -> UI feedback for employee forms. Returns field errors to show inline. */
export function apiErrorToForm(err: unknown): FormErrors {
  if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
    const fields = serverFieldErrors(err.details)
    if (Object.keys(fields).length) return fields
  }
  if (err instanceof ApiError && err.status === 403) toast.error(t("common.noPermission"))
  else toast.error(t("employees.toast.saveFailed"), { description: err instanceof Error ? err.message : undefined })
  return {}
}

/** Add (with login account) or edit an employee. */
export function useEmployeeForm(open: boolean, initial: Employee | null, onDone: () => void) {
  const { state, dispatch } = useStore()
  const [values, setValues] = React.useState<EmployeeFormValues>(() => toFormValues(null, ""))
  const [account, setAccount] = React.useState<AccountFormValues>(emptyAccount)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [saving, setSaving] = React.useState(false)
  const isNew = !initial

  // Reset whenever the dialog opens (not on every store change, which would wipe what the user typed)
  const reset = React.useEffectEvent(() => {
    setErrors({})
    setAccount(emptyAccount)
    setValues(toFormValues(initial, nextEmployeeCode(state.employees)))
  })
  React.useEffect(() => {
    if (open) reset()
  }, [open, initial])

  const set = <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) => setValues((f) => ({ ...f, [k]: v }))
  const setAcc = <K extends keyof AccountFormValues>(k: K, v: AccountFormValues[K]) => setAccount((a) => ({ ...a, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = { ...validateEmployee(values), ...(isNew ? validateAccount(account, true) : {}) }
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const input = toInput(values)
      const saved = isNew
        ? await employeesApi.create(input, { username: account.username.trim().toLowerCase(), password: account.password, role: account.role })
        : await employeesApi.update(initial.id, input)
      dispatch({ type: "employee/upsert", employee: saved })
      toast.success(isNew ? t("employees.toast.added") : t("employees.toast.updated"), {
        description: isNew ? t("employees.toast.signInAs", { name: `${saved.firstName} ${saved.lastName}`, username: saved.username ?? "" }) : `${saved.firstName} ${saved.lastName}`,
      })
      onDone()
    } catch (err) {
      setErrors(apiErrorToForm(err))
    } finally {
      setSaving(false)
    }
  }

  // Possible team leaders: active colleagues, never the employee themselves
  const leaderOptions = state.employees.filter((e) => e.id !== initial?.id && e.status !== "resigned")

  return { values, account, errors, saving, isNew, leaderOptions, set, setAcc, submit }
}
