import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormItem } from "@/components/shared/misc"
import { type Role, roleLabel } from "@/lib/auth"
import type { AccountFormValues, FormErrors } from "@/lib/employee-form"
import { t } from "@/i18n"
import { PasswordInput } from "./password-input"

/** Username / password / confirm / role. Only executives may grant the executive role. */
export function AccountFields({ values, errors, set, canGrantExecutive, passwordLabel = t("employees.account.password") }: {
  values: AccountFormValues
  errors: FormErrors
  set: <K extends keyof AccountFormValues>(k: K, v: AccountFormValues[K]) => void
  canGrantExecutive: boolean
  passwordLabel?: string
}) {
  const roles = (Object.keys(roleLabel) as Role[]).filter((r) => r !== "executive" || canGrantExecutive)
  return (
    <>
      <FormItem label={t("employees.account.username")} required htmlFor="username" error={errors.username}>
        <Input
          id="username"
          autoComplete="off"
          placeholder={t("employees.account.usernamePlaceholder")}
          aria-invalid={!!errors.username}
          value={values.username}
          onChange={(e) => set("username", e.target.value.toLowerCase())}
        />
      </FormItem>
      <FormItem label={t("employees.account.role")}>
        <Select value={values.role} onValueChange={(v) => set("role", v as Role)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
      <FormItem label={passwordLabel} required htmlFor="password" error={errors.password}>
        <PasswordInput id="password" placeholder={t("employees.account.passwordPlaceholder")} value={values.password} invalid={!!errors.password} onChange={(v) => set("password", v)} />
      </FormItem>
      <FormItem label={t("employees.account.confirm")} required htmlFor="confirm" error={errors.confirm}>
        <PasswordInput id="confirm" value={values.confirm} invalid={!!errors.confirm} onChange={(v) => set("confirm", v)} />
      </FormItem>
    </>
  )
}
