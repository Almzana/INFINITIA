import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormItem } from "@/components/shared/misc"
import { departments, type EmployeeStatus, employeeStatusLabel } from "@/data/mock"
import type { EmployeeFormValues, FormErrors } from "@/lib/employee-form"
import { deptLabel, t } from "@/i18n"

type Props = {
  values: EmployeeFormValues
  errors: FormErrors
  set: <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) => void
}

/** Name, contact and job details. */
export function EmployeeWorkFields({ values, errors, set }: Props) {
  const text = (k: "code" | "nickname" | "firstName" | "lastName" | "email" | "phone" | "position", label: string, opts: { required?: boolean; type?: string; placeholder?: string } = {}) => (
    <FormItem label={label} required={opts.required} htmlFor={k} error={errors[k]}>
      <Input id={k} type={opts.type} placeholder={opts.placeholder} aria-invalid={!!errors[k]} value={values[k]} onChange={(e) => set(k, e.target.value)} />
    </FormItem>
  )

  return (
    <>
      {text("code", t("employees.field.employeeCode"), { required: true })}
      {text("nickname", t("employees.field.nickname"))}
      {text("firstName", t("employees.field.firstName"), { required: true })}
      {text("lastName", t("employees.field.lastName"), { required: true })}
      {text("email", t("employees.field.companyEmail"), { required: true, type: "email" })}
      {text("phone", t("employees.field.phone"), { placeholder: "08x-xxx-xxxx" })}
      <FormItem label={t("employees.field.department")} required error={errors.department}>
        <Select value={values.department} onValueChange={(v) => set("department", v)}>
          <SelectTrigger className="w-full" aria-invalid={!!errors.department}>
            <SelectValue placeholder={t("employees.field.selectDepartment")} />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {deptLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
      {text("position", t("employees.field.position"), { required: true })}
      <FormItem label={t("employees.field.status")}>
        <Select value={values.status} onValueChange={(v) => set("status", v as EmployeeStatus)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {employeeStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
      <FormItem label={t("employees.field.startDate")} required htmlFor="startDate" error={errors.startDate}>
        <Input id="startDate" type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} />
      </FormItem>
      <FormItem label={t("employees.field.salaryBaht")} htmlFor="salary" error={errors.salary} className="sm:col-span-2">
        <Input id="salary" type="number" min={0} step={500} value={values.salary} onChange={(e) => set("salary", Number(e.target.value))} />
      </FormItem>
    </>
  )
}
