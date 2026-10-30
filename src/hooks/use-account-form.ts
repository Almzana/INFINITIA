import * as React from "react"
import { toast } from "sonner"
import type { Employee } from "@/data/mock"
import { apiErrorToForm } from "@/hooks/use-employee-form"
import { type AccountFormValues, emptyAccount, type FormErrors, validateAccount } from "@/lib/employee-form"
import { employeesApi } from "@/lib/employees-api"
import { useStore } from "@/lib/store"
import { t } from "@/i18n"

/**
 * Set username + password for an employee. Creates the login account if there is none,
 * otherwise sets a new password (the server signs that person out everywhere).
 */
export function useAccountForm(employee: Employee | null, onDone: () => void) {
  const { dispatch } = useStore()
  const [values, setValues] = React.useState<AccountFormValues>(emptyAccount)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [saving, setSaving] = React.useState(false)
  const hasAccount = !!employee?.username

  React.useEffect(() => {
    if (!employee) return
    setErrors({})
    setValues({ ...emptyAccount, username: employee.username ?? "", role: employee.role ?? "staff" })
  }, [employee])

  const set = <K extends keyof AccountFormValues>(k: K, v: AccountFormValues[K]) => setValues((a) => ({ ...a, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    const next = validateAccount(values, true)
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const saved = await employeesApi.setAccount(employee.id, {
        username: values.username.trim().toLowerCase(),
        password: values.password,
        // Only send a role when it actually changes (HR cannot re-submit an executive role)
        role: values.role !== (employee.role ?? "staff") ? values.role : undefined,
      })
      dispatch({ type: "employee/upsert", employee: saved })
      toast.success(hasAccount ? t("employees.toast.passwordReset") : t("employees.toast.accountCreated"), {
        description: hasAccount ? t("employees.toast.mustSignInAgain", { username: saved.username ?? "" }) : t("employees.toast.signInWith", { username: saved.username ?? "" }),
      })
      onDone()
    } catch (err) {
      setErrors(apiErrorToForm(err))
    } finally {
      setSaving(false)
    }
  }

  return { values, errors, saving, hasAccount, set, submit }
}
