import { PasswordInput } from "@/components/employees/password-input"
import { FormItem } from "@/components/shared/misc"
import type { PasswordErrors, PasswordRule } from "@/hooks/use-change-password"
import { t } from "@/i18n"
import { PasswordRuleList } from "./password-rule-list"

/** New password + confirmation with the live rule checklist. */
export function NewPasswordFields({ idPrefix, next, onNext, confirm, onConfirm, rules, errors }: {
  idPrefix: string
  next: string
  onNext: (v: string) => void
  confirm: string
  onConfirm: (v: string) => void
  rules: PasswordRule[]
  errors: PasswordErrors
}) {
  return (
    <>
      <FormItem label={t("password.new")} required htmlFor={`${idPrefix}-new`} error={errors.next}>
        <PasswordInput id={`${idPrefix}-new`} value={next} onChange={onNext} invalid={!!errors.next} />
      </FormItem>
      <FormItem label={t("password.confirm")} required htmlFor={`${idPrefix}-confirm`} error={errors.confirm}>
        <PasswordInput id={`${idPrefix}-confirm`} value={confirm} onChange={onConfirm} invalid={!!errors.confirm} />
      </FormItem>
      <PasswordRuleList rules={rules} />
    </>
  )
}
