import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormItem } from "@/components/shared/misc"
import type { EmployeeFormValues, FormErrors } from "@/lib/employee-form"
import { t } from "@/i18n"

/** Birth date, address and emergency contact (visible to HR / executives only). */
export function EmployeePersonalFields({ values, errors, set }: {
  values: EmployeeFormValues
  errors: FormErrors
  set: <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) => void
}) {
  return (
    <>
      <FormItem label={t("employees.field.birthDate")} htmlFor="birthDate">
        <Input id="birthDate" type="date" value={values.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
      </FormItem>
      <div className="hidden sm:block" />
      <FormItem label={t("employees.field.address")} htmlFor="address" className="sm:col-span-2">
        <Textarea id="address" rows={2} maxLength={500} value={values.address} onChange={(e) => set("address", e.target.value)} />
      </FormItem>
      <FormItem label={t("employees.field.emergencyName")} htmlFor="emergencyName">
        <Input id="emergencyName" maxLength={120} placeholder={t("employees.field.emergencyNamePlaceholder")} value={values.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
      </FormItem>
      <FormItem label={t("employees.field.emergencyPhone")} htmlFor="emergencyPhone" error={errors.emergencyPhone}>
        <Input
          id="emergencyPhone"
          placeholder="08x-xxx-xxxx"
          aria-invalid={!!errors.emergencyPhone}
          value={values.emergencyPhone}
          onChange={(e) => set("emergencyPhone", e.target.value)}
        />
      </FormItem>
    </>
  )
}
