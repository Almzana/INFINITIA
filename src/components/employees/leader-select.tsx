import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormItem } from "@/components/shared/misc"
import type { Employee } from "@/data/mock"
import { t } from "@/i18n"

const NONE = "none"

/** "Team leader" picker. Whoever is picked becomes a Leader and can assign tasks to this employee. */
export function LeaderSelect({ value, options, error, onChange }: {
  value: string
  options: Employee[]
  error?: string
  onChange: (id: string) => void
}) {
  return (
    <FormItem label={t("employees.leader.label")} error={error} className="sm:col-span-2">
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className="w-full" aria-invalid={!!error}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={NONE}>{t("employees.leader.none")}</SelectItem>
          {options.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.firstName} {e.lastName} · {e.position}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t("employees.leader.hint")}</p>
    </FormItem>
  )
}
