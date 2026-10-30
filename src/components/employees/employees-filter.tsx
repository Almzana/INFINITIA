import { RotateCcwIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { departments, type EmployeeStatus, employeeStatusLabel } from "@/data/mock"
import type { Filters } from "@/hooks/use-employees-list"
import { deptLabel, t } from "@/i18n"

/** Search form (applied on submit, Element Plus style). */
export function EmployeesFilter({ draft, onChange, onSearch, onReset }: {
  draft: Filters
  onChange: (f: Filters) => void
  onSearch: (e?: React.FormEvent) => void
  onReset: () => void
}) {
  return (
    <Card>
      <CardContent>
        <form onSubmit={onSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_auto]">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t("employees.filter.placeholder")}
              value={draft.keyword}
              onChange={(e) => onChange({ ...draft, keyword: e.target.value })}
            />
          </div>
          <Select value={draft.dept} onValueChange={(dept) => onChange({ ...draft, dept })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("employees.filter.allDepartments")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {deptLabel(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={draft.status} onValueChange={(status) => onChange({ ...draft, status })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("employees.filter.allStatuses")}</SelectItem>
              {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {employeeStatusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              <SearchIcon /> {t("common.search")}
            </Button>
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={onReset}>
              <RotateCcwIcon /> {t("common.reset")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
